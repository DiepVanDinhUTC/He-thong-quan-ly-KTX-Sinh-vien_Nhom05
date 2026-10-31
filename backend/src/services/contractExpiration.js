const { CONTRACT_PAYMENT_WINDOW_MS } = require('./invoiceDueDates');

const expireContracts = async (db, now = new Date(), legacy = false) => {
    const deadline = legacy ? { paymentDueAt: null, ngayTao: { lte: new Date(now.getTime() - CONTRACT_PAYMENT_WINDOW_MS) } } : { paymentDueAt: { lte: now } };
    const expired = await db.hopDong.findMany({ where: { trangThai: 'PENDING_PAYMENT', ...deadline }, select: { maHopDong: true, maPhong: true } });
    let count = 0;
    for (const contract of expired) {
        const cancelled = await db.$transaction(async (tx) => {
            const result = await tx.hopDong.updateMany({ where: { maHopDong: contract.maHopDong, maPhong: contract.maPhong, trangThai: 'PENDING_PAYMENT', ...deadline }, data: { trangThai: 'CANCELLED' } });
            if (result.count !== 1) return false;
            await tx.phong.updateMany({ where: { maPhong: contract.maPhong, soSinhVienHienTai: { gt: 0 } }, data: { soSinhVienHienTai: { decrement: 1 } } });
            return true;
        }, { isolationLevel: 'Serializable' });
        if (cancelled) count += 1;
    }
    return count;
};

module.exports = { expireContracts };
