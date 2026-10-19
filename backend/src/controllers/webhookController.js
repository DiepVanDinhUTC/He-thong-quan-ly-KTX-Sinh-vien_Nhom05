const prisma = require('../config/prisma');

const normalize = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

exports.handleBankTransfer = async (req, res) => {
    const secret = process.env.WEBHOOK_SECRET;
    const apiKey = req.headers['x-api-key'];
    if (!secret || apiKey !== secret) {
        return res.status(401).json({ success: false, message: 'Webhook chưa được xác thực.' });
    }

    const { amount, description } = req.body || {};
    const paidAmount = Number(amount);
    const reference = normalize(description);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0 || !reference) {
        return res.status(400).json({ success: false, message: 'Thông tin giao dịch không hợp lệ.' });
    }

    try {
        const candidates = await prisma.hopDong.findMany({
            where: { trangThai: 'PENDING_PAYMENT', tongTien: paidAmount },
            select: { maHopDong: true, maSinhVien: true, tongTien: true }
        });
        const matched = candidates.filter((contract) => reference.includes(normalize(contract.maSinhVien)));
        if (matched.length !== 1) {
            // Unknown and ambiguous bank references are acknowledged so the bank provider does not retry indefinitely.
            return res.status(200).json({ success: true, matched: false, message: 'Không tìm thấy duy nhất một hợp đồng cần thanh toán.' });
        }

        const contract = matched[0];
        const processed = await prisma.$transaction(async (tx) => {
            const claimed = await tx.hopDong.updateMany({
                where: { maHopDong: contract.maHopDong, trangThai: 'PENDING_PAYMENT' },
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

        return res.status(200).json({ success: true, matched: processed, message: processed ? 'Đã ghi nhận thanh toán.' : 'Giao dịch đã được ghi nhận trước đó.' });
    } catch (error) {
        console.error(`[webhook.bank] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể ghi nhận giao dịch lúc này.' });
    }
};
