const prisma = require('../config/prisma');
const STUDENT_ROLES = ['STUDENT', 'MILITARY_STUDENT'];
const { buildPaymentUrl, verifyCallback } = require('../utils/vnpay');
const { getContractInvoiceDueAt, getMonthlyInvoiceDueAt } = require('../services/invoiceDueDates');

const parseBillingPeriod = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
    const [year, month] = value.split('-').map(Number);
    if (year < 2000 || year > 2100) return null;
    return { year, month, start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
};

const isBuildingAllowed = (req, maToaNha) => (
    req.buildingScope === null || req.buildingScope === undefined || req.buildingScope.includes(maToaNha)
);

const ledgerStatus = async (db, method, bankReference) => {
    if (method === 'BANK_TRANSFER' && !bankReference) return 'NEEDS_REVIEW';
    if (!bankReference) return 'CONFIRMED';
    const duplicate = await db.financialTransaction.count({ where: { bankReference } });
    return duplicate ? 'NEEDS_REVIEW' : 'CONFIRMED';
};

const parseTransactionInput = (body = {}) => {
    const method = typeof body.method === 'string' ? body.method.trim().toUpperCase() : 'CASH';
    const bankReference = typeof body.bankReference === 'string' ? body.bankReference.trim().slice(0, 100) : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!['CASH', 'BANK_TRANSFER'].includes(method) || description.length > 1000) return null;
    return { method, bankReference: bankReference || null, description };
};

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
        const monthlyInvoiceIds = monthlyInvoices.map(({ id }) => id);
        const monthlyRefunds = monthlyInvoiceIds.length ? await prisma.financialTransaction.groupBy({
            by: ['invoiceId', 'status'],
            where: { invoiceType: 'MONTHLY', invoiceId: { in: monthlyInvoiceIds }, transactionType: 'REFUND' },
            _sum: { amount: true }
        }) : [];
        const refundsByInvoice = new Map();
        for (const item of monthlyRefunds) {
            const totals = refundsByInvoice.get(item.invoiceId) || { confirmed: 0, pending: 0 };
            if (item.status === 'CONFIRMED') totals.confirmed = item._sum.amount || 0;
            else totals.pending = item._sum.amount || 0;
            refundsByInvoice.set(item.invoiceId, totals);
        }
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
                    status: invoice.status === 'UNPAID' && invoice.totalAmount === 0 ? 'NO_CHARGE' : invoice.status,
                    refundedAmount: refundsByInvoice.get(invoice.id)?.confirmed || 0,
                    pendingRefundAmount: refundsByInvoice.get(invoice.id)?.pending || 0,
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
    const period = req.query.period ? parseBillingPeriod(req.query.period) : null;
    if (req.query.period && !period) return res.status(400).json({ success: false, message: 'Kỳ hóa đơn phải có định dạng YYYY-MM.' });
    try {
        const where = {
            ...(req.buildingScope === null || req.buildingScope === undefined ? {} : { hopDong: { is: { phong: { is: { maToaNha: { in: req.buildingScope } } } } } }),
            ...(period ? { periodStart: period.start } : {})
        };
        const monthlyInvoices = await prisma.monthlyInvoice.findMany({
            where,
            include: {
                sinhVien: { select: { maSV: true, hoTen: true } },
                hopDong: { select: { maHopDong: true, maPhong: true, phong: { select: { soPhong: true, maToaNha: true, toaNha: { select: { tenToaNha: true } } } } } },
                items: {
                    orderBy: { createdAt: 'asc' },
                    include: { ticket: { select: { id: true, title: true, maPhong: true } } }
                }
            },
            orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }]
        });
        const invoiceIds = monthlyInvoices.map(({ id }) => id);
        const refunds = invoiceIds.length ? await prisma.financialTransaction.groupBy({
            by: ['invoiceId', 'status'],
            where: { invoiceType: 'MONTHLY', invoiceId: { in: invoiceIds }, transactionType: 'REFUND' },
            _sum: { amount: true }
        }) : [];
        const refundByInvoice = new Map();
        for (const item of refunds) {
            const totals = refundByInvoice.get(item.invoiceId) || { confirmed: 0, pending: 0 };
            if (item.status === 'CONFIRMED') totals.confirmed = item._sum.amount || 0;
            else totals.pending = item._sum.amount || 0;
            refundByInvoice.set(item.invoiceId, totals);
        }
        return res.json({
            success: true,
            monthlyInvoices: monthlyInvoices.map((invoice) => ({
                ...invoice,
                status: invoice.status === 'UNPAID' && invoice.totalAmount === 0 ? 'NO_CHARGE' : invoice.status,
                refundedAmount: refundByInvoice.get(invoice.id)?.confirmed || 0,
                pendingRefundAmount: refundByInvoice.get(invoice.id)?.pending || 0,
                collectedAmount: ['PAID', 'REFUNDED'].includes(invoice.status) ? invoice.totalAmount : 0
            }))
        });
    } catch (error) {
        console.error(`[payments.monthly-invoices] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải hóa đơn tháng.' });
    }
};

exports.generateMonthlyInvoices = async (req, res) => {
    const period = parseBillingPeriod(req.body?.period);
    const electricityRate = Number(req.body?.electricityRate);
    const waterRate = Number(req.body?.waterRate);
    if (!period || !Number.isSafeInteger(electricityRate) || electricityRate < 1 || electricityRate > 1_000_000
        || !Number.isSafeInteger(waterRate) || waterRate < 1 || waterRate > 1_000_000) {
        return res.status(400).json({ success: false, message: 'Hãy chọn kỳ hợp lệ và nhập đơn giá điện, nước từ 1 đến 1.000.000 đồng.' });
    }
    const now = new Date();
    const vietnamPeriod = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).formatToParts(now);
    const currentStart = new Date(Date.UTC(
        Number(vietnamPeriod.find(({ type }) => type === 'year')?.value),
        Number(vietnamPeriod.find(({ type }) => type === 'month')?.value) - 1,
        1
    ));
    if (period.start > currentStart) return res.status(400).json({ success: false, message: 'Không thể lập hóa đơn cho kỳ trong tương lai.' });

    try {
        const contracts = await prisma.hopDong.findMany({
            where: {
                trangThai: 'ACTIVE',
                ngayBatDau: { lt: period.end },
                ngayKetThuc: { gte: period.start },
                ...(req.buildingScope === null || req.buildingScope === undefined ? {} : { phong: { is: { maToaNha: { in: req.buildingScope } } } })
            },
            include: {
                phong: {
                    select: {
                        maPhong: true,
                        soPhong: true,
                        maToaNha: true,
                        toaNha: { select: { tenToaNha: true } },
                        utilityMeterReadings: {
                            where: { periodStart: period.start },
                            select: { utilityType: true, previousReading: true, currentReading: true }
                        }
                    }
                }
            },
            orderBy: [{ maPhong: 'asc' }, { maSinhVien: 'asc' }]
        });
        const residentsByRoom = new Map();
        for (const contract of contracts) {
            const roomResidents = residentsByRoom.get(contract.maPhong) || [];
            roomResidents.push(contract);
            residentsByRoom.set(contract.maPhong, roomResidents);
        }

        let generated = 0;
        let skippedMissingReadings = 0;
        let skippedClosedInvoices = 0;
        for (const residents of residentsByRoom.values()) {
            const room = residents[0].phong;
            const readings = new Map(room.utilityMeterReadings.map((reading) => [reading.utilityType, reading]));
            const electricity = readings.get('ELECTRICITY');
            const water = readings.get('WATER');
            if (!electricity || !water) {
                skippedMissingReadings += residents.length;
                continue;
            }
            const totalElectricity = (electricity.currentReading - electricity.previousReading) * electricityRate;
            const totalWater = (water.currentReading - water.previousReading) * waterRate;
            if (![totalElectricity, totalWater].every((amount) => Number.isSafeInteger(amount) && amount <= 2_147_483_647)) {
                skippedMissingReadings += residents.length;
                continue;
            }

            for (let index = 0; index < residents.length; index += 1) {
                const contract = residents[index];
                const share = (amount) => Math.floor(amount / residents.length) + (index < amount % residents.length ? 1 : 0);
                const electricityAmount = share(totalElectricity);
                const waterAmount = share(totalWater);
                await prisma.$transaction(async (tx) => {
                    const invoice = await tx.monthlyInvoice.upsert({
                        where: { maHopDong_periodStart: { maHopDong: contract.maHopDong, periodStart: period.start } },
                        create: { maSinhVien: contract.maSinhVien, maHopDong: contract.maHopDong, periodStart: period.start, totalAmount: 0 },
                        update: {}
                    });
                    if (invoice.status !== 'UNPAID') {
                        skippedClosedInvoices += 1;
                        return;
                    }
                    await tx.monthlyInvoiceItem.deleteMany({ where: { invoiceId: invoice.id, type: { in: ['ELECTRICITY', 'WATER'] } } });
                    const existing = await tx.monthlyInvoiceItem.aggregate({ where: { invoiceId: invoice.id }, _sum: { amount: true } });
                    const roomShare = `phòng ${room.soPhong}, tổng dùng ${electricity.currentReading - electricity.previousReading} kWh và ${water.currentReading - water.previousReading} m³; chia ${residents.length} người`;
                    await tx.monthlyInvoiceItem.createMany({ data: [
                        { invoiceId: invoice.id, type: 'ELECTRICITY', description: `Điện ${roomShare}; đơn giá ${electricityRate.toLocaleString('vi-VN')} đ/kWh; chỉ số ${electricity.previousReading} → ${electricity.currentReading}.`, amount: electricityAmount, assessedById: req.user.id },
                        { invoiceId: invoice.id, type: 'WATER', description: `Nước ${roomShare}; đơn giá ${waterRate.toLocaleString('vi-VN')} đ/m³; chỉ số ${water.previousReading} → ${water.currentReading}.`, amount: waterAmount, assessedById: req.user.id }
                    ] });
                    await tx.monthlyInvoice.update({
                        where: { id: invoice.id },
                        data: { totalAmount: (existing._sum.amount || 0) + electricityAmount + waterAmount }
                    });
                    generated += 1;
                }, { isolationLevel: 'Serializable' });
            }
        }
        return res.json({
            success: true,
            message: `Đã lập/cập nhật ${generated} hóa đơn; bỏ qua ${skippedMissingReadings} hóa đơn do thiếu chỉ số và giữ nguyên ${skippedClosedInvoices} hóa đơn đã thu.`,
            generated,
            skippedMissingReadings,
            skippedClosedInvoices
        });
    } catch (error) {
        console.error(`[payments.invoice.generate] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể lập hóa đơn điện nước lúc này.' });
    }
};

exports.collectMonthlyInvoice = async (req, res) => {
    const invoiceId = String(req.params.invoiceId || '').trim();
    const input = parseTransactionInput(req.body);
    if (!invoiceId || !input) return res.status(400).json({ success: false, message: 'Thông tin thu phí không hợp lệ.' });
    try {
        const invoice = await prisma.monthlyInvoice.findUnique({
            where: { id: invoiceId },
            include: { hopDong: { include: { phong: { select: { maToaNha: true } } } } }
        });
        if (!invoice || !isBuildingAllowed(req, invoice.hopDong.phong.maToaNha)) return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn trong phạm vi tòa nhà được phân công.' });
        if (invoice.status !== 'UNPAID') return res.status(409).json({ success: false, message: 'Hóa đơn này không còn ở trạng thái chờ thu.' });
        if (invoice.totalAmount <= 0) return res.status(400).json({ success: false, message: 'Hóa đơn không phát sinh khoản cần thu.' });
        const result = await prisma.$transaction(async (tx) => {
            const claimed = await tx.monthlyInvoice.updateMany({ where: { id: invoice.id, status: 'UNPAID' }, data: { status: 'PAID' } });
            if (claimed.count !== 1) return null;
            await tx.vnpayPayment.updateMany({
                where: { invoiceType: 'MONTHLY', invoiceId: invoice.id, status: 'PENDING' },
                data: { status: 'FAILED' }
            });
            const status = await ledgerStatus(tx, input.method, input.bankReference);
            const transaction = await tx.financialTransaction.create({
                data: {
                    transactionType: 'COLLECTION', amount: invoice.totalAmount, method: input.method, status,
                    invoiceType: 'MONTHLY', invoiceId: invoice.id, maSinhVien: invoice.maSinhVien,
                    maToaNha: invoice.hopDong.phong.maToaNha, bankReference: input.bankReference,
                    description: input.description || 'Thu hóa đơn điện nước và phí tháng', createdById: req.user.id
                }
            });
            return transaction;
        }, { isolationLevel: 'Serializable' });
        if (!result) return res.status(409).json({ success: false, message: 'Hóa đơn vừa được thu bởi một giao dịch khác. Hãy tải lại danh sách.' });
        return res.json({ success: true, transaction: result, message: result.status === 'NEEDS_REVIEW' ? 'Đã ghi nhận khoản thu; giao dịch cần xác minh.' : 'Đã ghi nhận thu phí và gạch nợ hóa đơn.' });
    } catch (error) {
        console.error(`[payments.collect] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể ghi nhận thu phí lúc này.' });
    }
};

exports.refundMonthlyInvoice = async (req, res) => {
    const invoiceId = String(req.params.invoiceId || '').trim();
    const amount = Number(req.body?.amount);
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    const input = parseTransactionInput({ ...req.body, description: reason });
    if (!invoiceId || !input || !Number.isSafeInteger(amount) || amount <= 0 || reason.length < 5 || reason.length > 1000) {
        return res.status(400).json({ success: false, message: 'Nhập số tiền hoàn dương và lý do hoàn tiền (ít nhất 5 ký tự).' });
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            const invoice = await tx.monthlyInvoice.findUnique({
                where: { id: invoiceId },
                include: { hopDong: { include: { phong: { select: { maToaNha: true } } } } }
            });
            if (!invoice || !isBuildingAllowed(req, invoice.hopDong.phong.maToaNha)) return { error: 404, message: 'Không tìm thấy hóa đơn trong phạm vi tòa nhà được phân công.' };
            if (!['PAID', 'REFUNDED'].includes(invoice.status)) return { error: 409, message: 'Chỉ hoàn tiền cho hóa đơn đã thu.' };
            const prior = await tx.financialTransaction.aggregate({
                where: { invoiceType: 'MONTHLY', invoiceId: invoice.id, transactionType: 'REFUND' },
                _sum: { amount: true }
            });
            const remaining = invoice.totalAmount - (prior._sum.amount || 0);
            if (amount > remaining) return { error: 400, message: `Số tiền hoàn vượt quá số còn có thể hoàn (${remaining.toLocaleString('vi-VN')} đ).` };
            const status = await ledgerStatus(tx, input.method, input.bankReference);
            const transaction = await tx.financialTransaction.create({
                data: {
                    transactionType: 'REFUND', amount, method: input.method, status,
                    invoiceType: 'MONTHLY', invoiceId: invoice.id, maSinhVien: invoice.maSinhVien,
                    maToaNha: invoice.hopDong.phong.maToaNha, bankReference: input.bankReference,
                    description: reason, createdById: req.user.id
                }
            });
            if (amount === remaining && status === 'CONFIRMED') {
                await tx.monthlyInvoice.update({ where: { id: invoice.id }, data: { status: 'REFUNDED' } });
            }
            return { transaction };
        }, { isolationLevel: 'Serializable' });
        if (result.error) return res.status(result.error).json({ success: false, message: result.message });
        return res.json({ success: true, transaction: result.transaction, message: 'Đã ghi nhận khoản hoàn tiền vào sổ thu chi.' });
    } catch (error) {
        console.error(`[payments.refund] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể ghi nhận hoàn tiền lúc này.' });
    }
};

exports.getRepairTickets = async (req, res) => {
    try {
        const tickets = await prisma.maintenanceTicket.findMany({
            where: {
                status: 'COMPLETED',
                ...(req.buildingScope === null || req.buildingScope === undefined ? {} : { phong: { is: { maToaNha: { in: req.buildingScope } } } }),
                financialTransactions: { none: { transactionType: 'REPAIR_EXPENSE' } }
            },
            include: {
                sinhVien: { select: { maSV: true, hoTen: true } },
                phong: { select: { maPhong: true, soPhong: true, maToaNha: true, toaNha: { select: { tenToaNha: true } } } }
            },
            orderBy: { completedAt: 'desc' },
            take: 100
        });
        return res.json({ success: true, tickets });
    } catch (error) {
        console.error(`[payments.repair-tickets] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách sửa chữa đã hoàn tất.' });
    }
};

exports.recordRepairExpense = async (req, res) => {
    const ticketId = typeof req.body?.ticketId === 'string' ? req.body.ticketId.trim() : '';
    const amount = Number(req.body?.amount);
    const input = parseTransactionInput(req.body);
    if (!ticketId || !input || !Number.isSafeInteger(amount) || amount <= 0 || amount > 2_147_483_647) {
        return res.status(400).json({ success: false, message: 'Chọn phiếu sửa chữa và nhập số tiền chi hợp lệ.' });
    }
    try {
        const ticket = await prisma.maintenanceTicket.findUnique({
            where: { id: ticketId },
            include: { phong: { select: { maToaNha: true, soPhong: true } } }
        });
        if (!ticket || ticket.status !== 'COMPLETED' || !isBuildingAllowed(req, ticket.phong.maToaNha)) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa đã hoàn tất trong phạm vi được phân công.' });
        }
        if (await prisma.financialTransaction.findFirst({ where: { ticketId, transactionType: 'REPAIR_EXPENSE' } })) {
            return res.status(409).json({ success: false, message: 'Phiếu sửa chữa này đã có khoản chi được ghi nhận.' });
        }
        const status = await ledgerStatus(prisma, input.method, input.bankReference);
        const transaction = await prisma.financialTransaction.create({
            data: {
                transactionType: 'REPAIR_EXPENSE', amount, method: input.method, status,
                maToaNha: ticket.phong.maToaNha, ticketId,
                description: input.description || `Chi phí sửa chữa: ${ticket.title} · Phòng ${ticket.phong.soPhong}`,
                bankReference: input.bankReference, createdById: req.user.id
            }
        });
        return res.status(201).json({ success: true, transaction, message: status === 'NEEDS_REVIEW' ? 'Đã ghi nhận khoản chi; giao dịch cần xác minh.' : 'Đã ghi nhận chi phí sửa chữa.' });
    } catch (error) {
        console.error(`[payments.repair-expense] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể ghi nhận chi phí sửa chữa lúc này.' });
    }
};

exports.listFinancialTransactions = async (req, res) => {
    const period = req.query.period ? parseBillingPeriod(req.query.period) : null;
    if (req.query.period && !period) return res.status(400).json({ success: false, message: 'Kỳ đối soát phải có định dạng YYYY-MM.' });
    const dateFilter = period ? { gte: period.start, lt: period.end } : undefined;
    try {
        const where = {
            ...(dateFilter ? { createdAt: dateFilter } : {}),
            ...(req.buildingScope === null || req.buildingScope === undefined ? {} : { maToaNha: { in: req.buildingScope } })
        };
        const entries = await prisma.financialTransaction.findMany({
            where,
            include: {
                sinhVien: { select: { maSV: true, hoTen: true } },
                toaNha: { select: { maToaNha: true, tenToaNha: true } },
                ticket: { select: { id: true, title: true, maPhong: true } },
                createdBy: { select: { username: true } },
                reviewedBy: { select: { username: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 500
        });
        let allowedMonthlyIds;
        let allowedContractIds;
        if (req.buildingScope !== null && req.buildingScope !== undefined) {
            const buildingFilter = { phong: { is: { maToaNha: { in: req.buildingScope } } } };
            const [monthly, contracts] = await Promise.all([
                prisma.monthlyInvoice.findMany({ where: { hopDong: { is: buildingFilter } }, select: { id: true } }),
                prisma.hopDong.findMany({ where: buildingFilter, select: { maHopDong: true } })
            ]);
            allowedMonthlyIds = monthly.map(({ id }) => id);
            allowedContractIds = contracts.map(({ maHopDong }) => maHopDong);
        }
        const paymentWhere = {
            status: 'PAID',
            ...(dateFilter ? { paidAt: dateFilter } : {}),
            ...((allowedMonthlyIds || allowedContractIds) ? {
                OR: [
                    { invoiceType: 'MONTHLY', invoiceId: { in: allowedMonthlyIds || [] } },
                    { invoiceType: 'CONTRACT', invoiceId: { in: allowedContractIds || [] } }
                ]
            } : {})
        };
        const vnpayPayments = await prisma.vnpayPayment.findMany({ where: paymentWhere, orderBy: { paidAt: 'desc' }, take: 500 });
        const transactionIds = vnpayPayments.map(({ txnRef }) => txnRef);
        const representedPayments = transactionIds.length ? await prisma.financialTransaction.findMany({
            where: { paymentReference: { in: transactionIds } }, select: { paymentReference: true }
        }) : [];
        const representedRefs = new Set(representedPayments.map(({ paymentReference }) => paymentReference));
        const legacyVnpay = vnpayPayments.filter((payment) => !representedRefs.has(payment.txnRef)).map((payment) => ({
            id: `vnpay-${payment.id}`,
            transactionType: 'COLLECTION',
            amount: payment.amount,
            method: 'VNPAY',
            status: 'CONFIRMED',
            invoiceType: payment.invoiceType,
            invoiceId: payment.invoiceId,
            maSinhVien: payment.maSinhVien,
            bankReference: payment.bankTranNo || payment.txnRef,
            description: `Thanh toán VNPAY${payment.bankCode ? ` · ${payment.bankCode}` : ''}`,
            createdAt: payment.paidAt,
            sinhVien: null,
            toaNha: null,
            ticket: null,
            createdBy: null,
            reviewedBy: null
        }));

        const contractReceipts = await prisma.hoaDon.findMany({
            where: {
                ...(dateFilter ? { ngayThanhToan: dateFilter } : {}),
                phuongThuc: { not: 'VNPAY' },
                ...(req.buildingScope === null || req.buildingScope === undefined ? {} : { hopDong: { is: { phong: { is: { maToaNha: { in: req.buildingScope } } } } } })
            },
            include: { hopDong: { include: { sinhVien: { select: { maSV: true, hoTen: true } }, phong: { select: { maToaNha: true, toaNha: { select: { tenToaNha: true } } } } } }, nhanVien: { select: { hoTen: true } } },
            orderBy: { ngayThanhToan: 'desc' },
            take: 500
        });
        const recordedContractIds = new Set(entries.filter((entry) => entry.invoiceType === 'CONTRACT' && entry.transactionType === 'COLLECTION').map((entry) => entry.invoiceId));
        const legacyReceipts = contractReceipts.filter((receipt) => !recordedContractIds.has(receipt.maHopDong)).map((receipt) => ({
            id: `receipt-${receipt.maHoaDon}`,
            transactionType: 'COLLECTION',
            amount: Math.round(receipt.soTien),
            method: receipt.phuongThuc,
            status: 'CONFIRMED',
            invoiceType: 'CONTRACT',
            invoiceId: receipt.maHopDong,
            maSinhVien: receipt.hopDong.maSinhVien,
            maToaNha: receipt.hopDong.phong.maToaNha,
            bankReference: null,
            description: `Phí hợp đồng lưu trú · biên lai ${receipt.maHoaDon}`,
            createdAt: receipt.ngayThanhToan,
            sinhVien: receipt.hopDong.sinhVien,
            toaNha: receipt.hopDong.phong.toaNha,
            ticket: null,
            createdBy: receipt.nhanVien ? { username: receipt.nhanVien.hoTen } : null,
            reviewedBy: null
        }));
        const transactions = [...entries, ...legacyVnpay, ...legacyReceipts]
            .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
        return res.json({ success: true, transactions });
    } catch (error) {
        console.error(`[payments.ledger] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải sổ giao dịch thu chi.' });
    }
};

exports.reviewFinancialTransaction = async (req, res) => {
    const id = String(req.params.id || '').trim();
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    if (!id || note.length < 5 || note.length > 500) return res.status(400).json({ success: false, message: 'Nhập ghi chú xác minh từ 5 đến 500 ký tự.' });
    try {
        const transaction = await prisma.financialTransaction.findUnique({
            where: { id },
            select: { id: true, status: true, maToaNha: true, transactionType: true, invoiceType: true, invoiceId: true }
        });
        if (!transaction || !isBuildingAllowed(req, transaction.maToaNha)) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch trong phạm vi được phân công.' });
        if (transaction.status !== 'NEEDS_REVIEW') return res.status(409).json({ success: false, message: 'Giao dịch này đã được xác minh.' });
        const updated = await prisma.financialTransaction.update({
            where: { id },
            data: { status: 'CONFIRMED', reviewNote: note, reviewedById: req.user.id, reviewedAt: new Date() }
        });
        if (transaction.transactionType === 'REFUND' && transaction.invoiceType === 'MONTHLY' && transaction.invoiceId) {
            const [refunds, invoice] = await Promise.all([
                prisma.financialTransaction.aggregate({
                    where: { invoiceType: 'MONTHLY', invoiceId: transaction.invoiceId, transactionType: 'REFUND', status: 'CONFIRMED' },
                    _sum: { amount: true }
                }),
                prisma.monthlyInvoice.findUnique({ where: { id: transaction.invoiceId }, select: { totalAmount: true, status: true } })
            ]);
            if (invoice && (refunds._sum.amount || 0) >= invoice.totalAmount && invoice.status === 'PAID') {
                await prisma.monthlyInvoice.update({ where: { id: transaction.invoiceId }, data: { status: 'REFUNDED' } });
            }
        }
        return res.json({ success: true, transaction: updated, message: 'Đã lưu kết quả xác minh giao dịch.' });
    } catch (error) {
        console.error(`[payments.ledger.review] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái xác minh lúc này.' });
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
                const room = await tx.phong.findUnique({ where: { maPhong: contract.maPhong }, select: { maToaNha: true } });
                const bankReference = String(params.vnp_BankTranNo || payment.txnRef).slice(0, 100);
                await tx.financialTransaction.create({
                    data: {
                        transactionType: 'COLLECTION', amount: payment.amount, method: 'VNPAY',
                        status: await ledgerStatus(tx, 'VNPAY', bankReference),
                        invoiceType: 'CONTRACT', invoiceId: contract.maHopDong, maSinhVien: contract.maSinhVien,
                        maToaNha: room?.maToaNha || null, bankReference, paymentReference: payment.txnRef,
                        description: `Thanh toán VNPAY${params.vnp_BankCode ? ` · ${params.vnp_BankCode}` : ''}`
                    }
                });
            } else {
                const invoice = await tx.monthlyInvoice.findFirst({
                    where: { id: payment.invoiceId, maSinhVien: payment.maSinhVien, status: 'UNPAID', totalAmount: payment.amount },
                    include: { hopDong: { include: { phong: { select: { maToaNha: true } } } } }
                });
                if (!invoice) throw new Error('Monthly invoice no longer matches VNPAY payment');
                await tx.monthlyInvoice.update({ where: { id: invoice.id }, data: { status: 'PAID' } });
                const bankReference = String(params.vnp_BankTranNo || payment.txnRef).slice(0, 100);
                await tx.financialTransaction.create({
                    data: {
                        transactionType: 'COLLECTION', amount: payment.amount, method: 'VNPAY',
                        status: await ledgerStatus(tx, 'VNPAY', bankReference),
                        invoiceType: 'MONTHLY', invoiceId: invoice.id, maSinhVien: invoice.maSinhVien,
                        maToaNha: invoice.hopDong.phong.maToaNha, bankReference, paymentReference: payment.txnRef,
                        description: `Thanh toán VNPAY${params.vnp_BankCode ? ` · ${params.vnp_BankCode}` : ''}`
                    }
                });
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
    const input = parseTransactionInput(req.body || {});
    if (!input) return res.status(400).json({ success: false, message: 'Thông tin thanh toán không hợp lệ.' });
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
                data: { maHopDong, soTien: contract.tongTien, phuongThuc: input.method === 'CASH' ? 'COUNTER' : 'TRANSFER', nguoiThu }
            });
            const room = await tx.phong.findUnique({ where: { maPhong: contract.maPhong }, select: { maToaNha: true } });
            await tx.financialTransaction.create({
                data: {
                    transactionType: 'COLLECTION', amount: Math.round(contract.tongTien), method: input.method,
                    status: await ledgerStatus(tx, input.method, input.bankReference), invoiceType: 'CONTRACT',
                    invoiceId: maHopDong, maSinhVien: contract.maSinhVien, maToaNha: room?.maToaNha || null,
                    bankReference: input.bankReference, description: input.description || 'Thu phí hợp đồng lưu trú',
                    createdById: req.user.id
                }
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
