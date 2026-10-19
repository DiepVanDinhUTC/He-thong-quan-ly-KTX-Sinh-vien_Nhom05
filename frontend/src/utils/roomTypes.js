export const roomTypes = [
  { value: 'CO_BAN', label: 'Cơ bản', capacities: [4, 6, 8], feeRange: '150.000–300.000', detail: 'Vệ sinh khép kín, giường tầng, internet.' },
  { value: 'CO_BAN_NHO', label: 'Cơ bản nhỏ', capacities: [4, 6], feeRange: '150.000–225.000', detail: 'Vệ sinh khép kín, giường tầng, internet.' },
  { value: 'THIET_BI_TANG_CUONG', label: 'Thiết bị tăng cường', capacities: [6], feeRange: '625.000', detail: 'Cải tạo hạ tầng, bình nước nóng, điều hòa, internet.' },
  { value: 'PHO_THONG_KHONG_DIEU_HOA', label: 'Phổ thông không điều hòa', capacities: [4, 6, 8], feeRange: '570.000–1.140.000', detail: 'Nâng cấp hạ tầng, giường tầng, vệ sinh khép kín, bình nước nóng, internet.' },
  { value: 'PHO_THONG_CO_DIEU_HOA', label: 'Phổ thông có điều hòa', capacities: [4, 6], feeRange: '830.000–1.245.000', detail: 'Nâng cấp hạ tầng, giường tầng, vệ sinh khép kín, bình nước nóng, điều hòa, internet.' },
  { value: 'TIEU_CHUAN', label: 'Tiêu chuẩn', capacities: [4, 6], feeRange: '850.000–1.275.000', detail: 'Có điều hòa, bình nước nóng, tủ quần áo, tủ giày, bàn học, internet.' },
  { value: 'QUAT', label: 'Phòng quạt', capacities: [], feeRange: '', detail: 'Loại phòng cũ.' },
  { value: 'DIEU_HOA', label: 'Phòng điều hòa', capacities: [], feeRange: '', detail: 'Loại phòng cũ.' },
];

const labels = new Map(roomTypes.map(({ value, label }) => [value, label]));

export const roomTypeLabel = (value) => labels.get(value) || value || 'Chưa cập nhật';
