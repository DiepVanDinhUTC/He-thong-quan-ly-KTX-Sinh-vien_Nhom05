const { ROOM_TYPES } = require('../config/roomTypes');

const LEGACY_MONTHLY_FEES = { QUAT: 120000, DIEU_HOA: 200000 };
const pricingError = (message) => Object.assign(new Error(message), { status: 409 });

const calculateContractRent = (contract, room) => {
    const monthlyFee = room.phiNoiTruThang
        ?? ROOM_TYPES[room.loaiPhong]?.monthlyFeeByCapacity[room.soSinhVienToiDa]
        ?? LEGACY_MONTHLY_FEES[room.loaiPhong];
    if (!Number.isFinite(monthlyFee) || monthlyFee < 0) {
        throw pricingError('Phòng chưa có phí nội trú hợp lệ. Vui lòng cập nhật giá phòng.');
    }

    const start = new Date(contract.ngayBatDau);
    const end = new Date(contract.ngayKetThuc);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
        throw pricingError('Thời hạn hợp đồng không hợp lệ để tính lại tiền phòng.');
    }

    // Count calendar months so a ten-month contract stays ten months, even across 31-day months.
    let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12
        + end.getUTCMonth() - start.getUTCMonth();
    const anniversary = new Date(start);
    anniversary.setUTCMonth(start.getUTCMonth() + months);
    if (end > anniversary) months += 1;

    return Math.round(monthlyFee * Math.max(1, months));
};

module.exports = { calculateContractRent };
