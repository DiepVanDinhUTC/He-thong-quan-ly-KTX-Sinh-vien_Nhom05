const prisma = require('../config/prisma');
const { createHash } = require('crypto');

const normalize = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

exports.handleBankTransfer = async (req, res) => {
    const secret = process.env.WEBHOOK_SECRET;
    const apiKey = req.headers['x-api-key'];
    if (!secret || apiKey !== secret) {
        return res.status(401).json({ success: false, message: 'Webhook chưa được xác thực.' });
    }

    const { amount, description, transactionId } = req.body || {};
    const paidAmount = Number(amount);
    const reference = normalize(description);
    if (!Number.isSafeInteger(paidAmount) || paidAmount <= 0 || !reference) {
        return res.status(400).json({ success: false, message: 'Thông tin giao dịch không hợp lệ.' });
    }

    try {
        const candidates = await prisma.hopDong.findMany({
            where: { tongTien: paidAmount, OR: [{ trangThai: 'PENDING_PAYMENT' }, { trangThai: 'CANCELLED', paymentDueAt: { not: null } }] },
            select: { maHopDong: true, maSinhVien: true, tongTien: true, paymentDueAt: true, trangThai: true, phong: { select: { maToaNha: true } } }
        });
        const matched = candidates.filter((contract) => reference.includes(normalize(contract.maSinhVien)));
        if (matched.length !== 1) {
            // Unknown and ambiguous bank references are acknowledged so the bank provider does not retry indefinitely.
            return res.status(200).json({ success: true, matched: false, message: 'Không tìm thấy duy nhất một hợp đồng cần thanh toán.' });
        }

        const contract = matched[0];
        const recordLateTransfer = async () => {
            const sourceId = typeof transactionId === 'string' ? transactionId.trim().slice(0, 100) : '';
            const paymentReference = sourceId ? `BANKWEB-${createHash('sha256').update(sourceId).digest('hex')}` : null;
            const data = {
                transactionType: 'COLLECTION', amount: paidAmount, method: 'BANK_TRANSFER', status: 'NEEDS_REVIEW',
                invoiceType: 'CONTRACT', invoiceId: contract.maHopDong, maSinhVien: contract.maSinhVien,
                maToaNha: contract.phong?.maToaNha || null, bankReference: sourceId || null, paymentReference,
                description: `Chuyển khoản sau hạn hoặc sau khi hủy; cần đối soát. Nội dung: ${String(description).slice(0, 750)}`
            };
            if (paymentReference) await prisma.financialTransaction.upsert({ where: { paymentReference }, create: data, update: {} });
            else await prisma.financialTransaction.create({ data });
            return res.status(200).json({ success: true, matched: false, needsReview: true, message: 'Hợp đồng đã hết hạn thanh toán; giao dịch đang chờ đối soát.' });
        };
        if (contract.paymentDueAt && (contract.trangThai === 'CANCELLED' || new Date(contract.paymentDueAt).getTime() <= Date.now())) return await recordLateTransfer();
        const processed = await prisma.$transaction(async (tx) => {
            const claimed = await tx.hopDong.updateMany({
                where: { maHopDong: contract.maHopDong, trangThai: 'PENDING_PAYMENT', OR: [{ paymentDueAt: null }, { paymentDueAt: { gt: new Date() } }] },
                data: { trangThai: 'ACTIVE' }
            });
            if (claimed.count !== 1) return false;
            await tx.hoaDon.create({
                data: {
                    maHopDong: contract.maHopDong,
                    soTien: contract.tongTien,
                    phuongThuc: 'TRANSFER',
                    nguoiThu: null
                }
            });
            return true;
        }, { isolationLevel: 'Serializable' });

        if (!processed && contract.paymentDueAt) {
            const current = await prisma.hopDong.findUnique({ where: { maHopDong: contract.maHopDong }, select: { trangThai: true } });
            if (current?.trangThai === 'CANCELLED' || new Date(contract.paymentDueAt).getTime() <= Date.now()) return await recordLateTransfer();
        }
        return res.status(200).json({ success: true, matched: processed, message: processed ? 'Đã ghi nhận thanh toán.' : 'Giao dịch đã được ghi nhận trước đó.' });
    } catch (error) {
        console.error(`[webhook.bank] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể ghi nhận giao dịch lúc này.' });
    }
};
