const ROOM_TYPES = {
    CO_BAN: {
        label: 'Cơ bản',
        capacities: [4, 6, 8],
        monthlyFeeByCapacity: { 4: 300000, 6: 200000, 8: 150000 },
        amenities: ['Vệ sinh khép kín', 'Giường tầng', 'Internet']
    },
    CO_BAN_NHO: {
        label: 'Cơ bản nhỏ',
        capacities: [4, 6],
        monthlyFeeByCapacity: { 4: 225000, 6: 150000 },
        amenities: ['Vệ sinh khép kín', 'Giường tầng', 'Internet']
    },
    THIET_BI_TANG_CUONG: {
        label: 'Thiết bị tăng cường',
        capacities: [6],
        monthlyFeeByCapacity: { 6: 625000 },
        amenities: ['Cải tạo cơ sở hạ tầng', 'Vệ sinh khép kín', 'Giường tầng', 'Bình nước nóng', 'Điều hòa không khí', 'Internet']
    },
    PHO_THONG_KHONG_DIEU_HOA: {
        label: 'Phổ thông không điều hòa',
        capacities: [4, 6, 8],
        monthlyFeeByCapacity: { 4: 1140000, 6: 760000, 8: 570000 },
        amenities: ['Nâng cấp cơ sở hạ tầng', 'Giường tầng', 'Vệ sinh khép kín', 'Bình nước nóng', 'Internet']
    },
    PHO_THONG_CO_DIEU_HOA: {
        label: 'Phổ thông có điều hòa',
        capacities: [4, 6],
        monthlyFeeByCapacity: { 4: 1245000, 6: 830000 },
        amenities: ['Nâng cấp cơ sở hạ tầng', 'Giường tầng', 'Vệ sinh khép kín', 'Bình nước nóng', 'Điều hòa không khí', 'Internet']
    },
    CG_A1: {
        label: 'Cầu Giấy A1',
        capacities: [4],
        monthlyFeeByCapacity: { 4: 1300000 },
        amenities: ['Nâng cấp cơ sở hạ tầng', 'Giường tầng', 'Vệ sinh khép kín', 'Bình nước nóng', 'Điều hòa không khí', 'Internet']
    },
    CG_A2: {
        label: 'Cầu Giấy A2',
        capacities: [4],
        monthlyFeeByCapacity: { 4: 1625000 },
        amenities: ['Nâng cấp cơ sở hạ tầng', 'Giường tầng', 'Vệ sinh khép kín', 'Bình nước nóng', 'Điều hòa không khí', 'Tủ quần áo', 'Tủ giày', 'Internet']
    },
    CG_B1: {
        label: 'Cầu Giấy B1',
        capacities: [1],
        monthlyFeeByCapacity: { 1: 3600000 },
        amenities: ['Nâng cấp cơ sở hạ tầng', 'Giường đơn', 'Vệ sinh khép kín', 'Bình nước nóng', 'Điều hòa không khí', 'Internet']
    },
    CG_B2: {
        label: 'Cầu Giấy B2',
        capacities: [2],
        monthlyFeeByCapacity: { 2: 2100000 },
        amenities: ['Nâng cấp cơ sở hạ tầng', 'Giường đơn', 'Vệ sinh khép kín', 'Bình nước nóng', 'Điều hòa không khí', 'Internet']
    },
    CG_B3: {
        label: 'Cầu Giấy B3',
        capacities: [2],
        monthlyFeeByCapacity: { 2: 2400000 },
        amenities: ['Nâng cấp cơ sở hạ tầng', 'Giường đơn', 'Vệ sinh khép kín', 'Bình nước nóng', 'Điều hòa không khí', 'Internet']
    },
    TIEU_CHUAN: {
        label: 'Tiêu chuẩn',
        capacities: [4, 6],
        monthlyFeeByCapacity: { 4: 1275000, 6: 850000 },
        amenities: ['Nâng cấp cơ sở hạ tầng', 'Giường tầng', 'Vệ sinh khép kín', 'Bình nước nóng', 'Điều hòa không khí', 'Tủ quần áo', 'Tủ giày', 'Bàn học', 'Internet']
    }
};

const LEGACY_ROOM_TYPE_CODES = ['QUAT', 'DIEU_HOA'];
const A4_ONLY_ROOM_TYPES = new Set(['THIET_BI_TANG_CUONG', 'PHO_THONG_CO_DIEU_HOA', 'TIEU_CHUAN']);

module.exports = { ROOM_TYPES, LEGACY_ROOM_TYPE_CODES, A4_ONLY_ROOM_TYPES };
