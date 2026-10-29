export const isMilitaryLearner = (student) => Boolean(student?.role === 'MILITARY_STUDENT' || student?.laHocVienQuanSu || student?.militaryStay);
export const currentResidence = (student) => student?.currentResidence || student?.currentContract || null;
export const militaryStayLabels = { ACTIVE: 'Đang học GDQP', UPCOMING: 'Sắp đến đợt học', ENDED: 'Đã kết thúc đợt học' };
export const residenceDate = (value) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }) : 'Chưa cập nhật';
