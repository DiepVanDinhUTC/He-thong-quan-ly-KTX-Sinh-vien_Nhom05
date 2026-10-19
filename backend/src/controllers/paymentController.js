const prisma = require('../config/prisma');
const STUDENT_ROLES = ['STUDENT', 'MILITARY_STUDENT'];
const { buildPaymentUrl, verifyCallback } = require('../utils/vnpay');
const { getContractInvoiceDueAt, getMonthlyInvoiceDueAt } = require('../services/invoiceDueDates');

exports.getMyPayments = async (req, res) => {
    if (!STUDENT_ROLES.includes(req.user.role) || !req.user.maSV) {
        return res.status(403).json({ success: false, message: 'Chức năng này chỉ dành cho sinh viên và học viên quân sự.' });
    }
    try {
        const contracts = await prisma.hopDong.findMany({
            where: { maSinhVien: req.user.maSV },
            include: { phong: true, hoaDons: { orderBy: { ngayThanhToan: 'desc' } } },
            orderBy: { ngayTao: 'desc' }
        });
        const monthlyInvoices = await prisma.monthlyInvoice.findMany({
            where: { maSinhVien: req.user.maSV },
            include: {
                items: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        id: true, type: true, description: true, amount: true, createdAt: true,
                        ticket: { select: { id: true, title: true, maPhong: true } }
                    }
                }
            },
            orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }]
        });
        const payments = contracts.flatMap((contract) => contract.hoaDons.map((payment) => ({
            ...payment,
            maSinhVien: contract.maSinhVien,
            maPhong: contract.maPhong,
            soPhong: contract.phong?.soPhong || contract.maPhong
        }))).sort((left, right) => new Date(right.ngayThanhToan) - new Date(left.ngayThanhToan));
        const vnpayPayments = await prisma.vnpayPayment.findMany({
            where: { maSinhVien: req.user.maSV },
            orderBy: { paidAt: 'desc' }
        });
        return res.json({
            success: true,
            contracts: contracts.map(({ hoaDons, ...contract }) => {
                const dueAt = getContractInvoiceDueAt(contract);
                return {
                    ...contract,
                    dueAt,
                    isOverdue: contract.trangThai === 'PENDING_PAYMENT' && Boolean(dueAt && dueAt.getTime() < Date.now()),
                    daThanhToan: hoaDons.length > 0,
                    payments: hoaDons
                };
            }),
            payments,
            vnpayPayments,
            monthlyInvoices: monthlyInvoices.map((invoice) => {
                const dueAt = getMonthlyInvoiceDueAt(invoice);
                return {
                    ...invoice,
                    dueAt,
                    isOverdue: invoice.status === 'UNPAID' && Boolean(dueAt && dueAt.getTime() < Date.now())
                };
            })
        });
    } catch (error) {
        console.error(`[payments.mine] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải hóa đơn và lịch sử thanh toán.' });
    }
};

exports.getMonthlyInvoices = async (req, res) => {
    try {
        const where = req.buildingScope === null || req.buildingScope === undefined
            ? undefined
            : { hopDong: { is: { phong: { is: { maToaNha: { in: req.buildingScope } } } } } };
        const monthlyInvoices = await prisma.monthlyInvoice.findMany({
            where,
            include: {
                sinhVien: { select: { maSV: true, hoTen: true } },
                hopDong: { select: { maHopDong: true, maPhong: true, phong: { select: { soPhong: true, maToaNha: true } } } },
                items: {
                    orderBy: { createdAt: 'asc' },
                    include: { ticket: { select: { id: true, title: true, maPhong: true } } }
                }
            },
            orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }]
        });
        return res.json({ success: true, monthlyInvoices });
    } catch (error) {
        console.error(`[payments.monthly-invoices] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải hóa đơn tháng.' });
    }
};

exports.createVnpayPayment = async (req, res) => {
    if (!STUDENT_ROLES.includes(req.user.role) || !req.user.maSV) {
        return res.status(403).json({ success: false, message: 'Chức năng này chỉ dành cho sinh viên và học viên quân sự.' });
    }
    const { invoiceType, invoiceId } = req.body || {};
    if (!['CONTRACT', 'MONTHLY'].includes(invoiceType) || typeof invoiceId !== 'string' || !invoiceId.trim()) {
        return res.status(400).json({ success: false, message: 'Mã hóa đơn không hợp lệ.' });
    }
    try {
        let invoice;
        if (invoiceType === 'CONTRACT') {
            const contract = await prisma.hopDong.findFirst({
                where: { maHopDong: invoiceId, maSinhVien: req.user.maSV },
                select: { maHopDong: true, maSinhVien: true, tongTien: true, trangThai: true }
            });
            if (!contract || contract.trangThai !== 'PENDING_PAYMENT') {
                return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn hợp đồng đang chờ thanh toán của bạn.' });
            }
            invoice = { id: contract.maHopDong, maSinhVien: contract.maSinhVien, amount: Math.round(contract.tongTien) };
        } else {
            const monthlyInvoice = await prisma.monthlyInvoice.findFirst({
                where: { id: invoiceId, maSinhVien: req.user.maSV },
                select: { id: true, maSinhVien: true, totalAmount: true, status: true }
            });
            if (!monthlyInvoice || monthlyInvoice.status !== 'UNPAID') {
                return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn tháng đang chờ thanh toán của bạn.' });
            }
            invoice = { id: monthlyInvoice.id, maSinhVien: monthlyInvoice.maSinhVien, amount: monthlyInvoice.totalAmount };
        }
        if (!Number.isSafeInteger(invoice.amount) || invoice.amount < 5000) {
            return res.status(400).json({ success: false, message: 'Số tiền hóa đơn phải từ 5.000 đồng để thanh toán qua VNPAY.' });
        }
        const pendingPayment = await prisma.vnpayPayment.findFirst({
            where: { invoiceType, invoiceId: invoice.id, maSinhVien: invoice.maSinhVien, status: 'PENDING' },
            orderBy: { createdAt: 'desc' }
        });
        const reusePending = pendingPayment
            && pendingPayment.amount === invoice.amount
            && Date.now() - pendingPayment.createdAt.getTime() < 15 * 60 * 1000;
        const txnRef = reusePending
            ? pendingPayment.txnRef
            : `KTX${Date.now()}${require('crypto').randomBytes(4).toString('hex')}`;
        const orderInfo = `KTX HDON ${invoice.id} SV ${invoice.maSinhVien}`.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 255);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const returnUrl = process.env.VNPAY_RETURN_URL || (process.env.NODE_ENV === 'production' ? '' : `${frontendUrl.replace(/\/$/, '')}/bill-payment`);
        const paymentUrl = buildPaymentUrl({
            txnRef,
            amount: invoice.amount,
            orderInfo,
            ipAddr: req.ip,
            returnUrl
        });
        if (pendingPayment && !reusePending) {
            await prisma.vnpayPayment.update({ where: { id: pendingPayment.id }, data: { status: 'FAILED' } });
        }
        const payment = reusePending ? pendingPayment : await prisma.vnpayPayment.create({
            data: { txnRef, invoiceType, invoiceId: invoice.id, maSinhVien: invoice.maSinhVien, amount: invoice.amount }
        });
        return res.json({
            success: true,
            data: {
                txnRef: payment.txnRef,
                invoiceType,
                invoiceId: invoice.id,
                maSinhVien: invoice.maSinhVien,
                amount: invoice.amount,
                paymentUrl
            }
        });
    } catch (error) {
        console.error(`[payments.vnpay.create] ${error.code || 'ERROR'}: ${error.message}`);
        const missingConfig = /must be configured/.test(error.message);
        return res.status(missingConfig ? 503 : 500).json({ success: false, message: missingConfig ? 'Hệ thống chưa cấu hình kết nối VNPAY.' : 'Không thể tạo giao dịch VNPAY lúc này.' });
    }
};

exports.handleVnpayIpn = async (req, res) => {
    const params = req.query || {};
    if (!verifyCallback(params)) return res.json({ RspCode: '97', Message: 'Invalid signature' });
    if (params.vnp_TmnCode !== process.env.VNPAY_TMN_CODE) return res.json({ RspCode: '97', Message: 'Invalid merchant' });
    try {
        const payment = await prisma.vnpayPayment.findUnique({ where: { txnRef: String(params.vnp_TxnRef || '') } });
        if (!payment) return res.json({ RspCode: '01', Message: 'Order not found' });
        if (payment.status === 'PAID') return res.json({ RspCode: '02', Message: 'Order already confirmed' });
        if (Number(params.vnp_Amount) !== payment.amount * 100) return res.json({ RspCode: '04', Message: 'Invalid amount' });

        const successful = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';
        if (!successful) {
            await prisma.vnpayPayment.update({
                where: { id: payment.id },
                data: { status: 'FAILED', responseCode: String(params.vnp_ResponseCode || '').slice(0, 2) }
            });
            return res.json({ RspCode: '00', Message: 'Confirm Success' });
        }

        await prisma.$transaction(async (tx) => {
            const claimed = await tx.vnpayPayment.updateMany({
                where: { id: payment.id, status: 'PENDING' },
                data: {
                    status: 'PAID',
                    paidAt: params.vnp_PayDate ? parseVnpayPayDate(params.vnp_PayDate) : new Date(),
                    bankCode: String(params.vnp_BankCode || '').slice(0, 20),
                    bankTranNo: String(params.vnp_BankTranNo || '').slice(0, 255),
                    vnpTransactionNo: String(params.vnp_TransactionNo || '').slice(0, 30),
                    responseCode: '00'
                }
            });
            if (claimed.count !== 1) return;

            if (payment.invoiceType === 'CONTRACT') {
                const contract = await tx.hopDong.findFirst({
                    where: { maHopDong: payment.invoiceId, maSinhVien: payment.maSinhVien, trangThai: 'PENDING_PAYMENT' }
                });
                if (!contract || Math.round(contract.tongTien) !== payment.amount) throw new Error('Invoice no longer matches VNPAY payment');
                const activated = await tx.hopDong.updateMany({
                    where: { maHopDong: contract.maHopDong, trangThai: 'PENDING_PAYMENT' },
                    data: { trangThai: 'ACTIVE' }
                });
                if (activated.count !== 1) throw new Error('Contract payment was already applied');
                await tx.hoaDon.create({
                    data: { maHopDong: contract.maHopDong, soTien: payment.amount, phuongThuc: 'VNPAY', nguoiThu: null }
                });
            } else {
                const invoice = await tx.monthlyInvoice.findFirst({
                    where: { id: payment.invoiceId, maSinhVien: payment.maSinhVien, status: 'UNPAID', totalAmount: payment.amount }
                });
                if (!invoice) throw new Error('Monthly invoice no longer matches VNPAY payment');
                await tx.monthlyInvoice.update({ where: { id: invoice.id }, data: { status: 'PAID' } });
            }
        }, { isolationLevel: 'Serializable' });
        return res.json({ RspCode: '00', Message: 'Confirm Success' });
    } catch (error) {
        console.error(`[payments.vnpay.ipn] ${error.code || 'ERROR'}: ${error.message}`);
        return res.json({ RspCode: '99', Message: 'Processing error' });
    }
};

const parseVnpayPayDate = (value) => {
    const match = String(value).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
    if (!match) return new Date();
    const [, year, month, day, hour, minute, second] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 7, Number(minute), Number(second)));
};

exports.processPayment = async (req, res) => {
    const { maHopDong } = req.params;
    const nguoiThu = req.user.maNhanVien || null;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const contract = await tx.hopDong.findUnique({ where: { maHopDong } });
            if (!contract || contract.trangThai !== 'PENDING_PAYMENT') {
                return null;
            }
            const claimed = await tx.hopDong.updateMany({
                where: { maHopDong, trangThai: 'PENDING_PAYMENT' }, data: { trangThai: 'ACTIVE' }
            });
            if (claimed.count !== 1) return null;
            const invoice = await tx.hoaDon.create({
                data: { maHopDong, soTien: contract.tongTien, phuongThuc: 'COUNTER', nguoiThu }
            });
            return { invoice };
        }, { isolationLevel: 'Serializable' });
        if (!result) return res.status(409).json({ success: false, message: 'Hợp đồng không còn khoản phí chờ thanh toán.' });
        return res.json({ success: true, message: 'Đã ghi nhận thanh toán và kích hoạt hợp đồng.', data: result });
    } catch (error) {
        console.error(`[payments.process] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xử lý thanh toán.' });
    }
};
