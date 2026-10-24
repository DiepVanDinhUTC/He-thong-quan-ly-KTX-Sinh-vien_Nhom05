export const PAYMENT_PERIOD_MONTHS = 5;

export const currentHousingDate = (now = new Date()) => new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const housingPeriodEnd = (start = currentHousingDate()) => {
  const startDate = new Date(start);
  const end = new Date(startDate);
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + PAYMENT_PERIOD_MONTHS);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(startDate.getUTCDate(), lastDay));
  return end.toISOString().slice(0, 10);
};

export const defaultHousingAmount = (room, roomType = room?.loaiPhong) => (
  (room?.phiNoiTruThang ?? (roomType === 'DIEU_HOA' ? 200000 : 120000)) * PAYMENT_PERIOD_MONTHS
);
