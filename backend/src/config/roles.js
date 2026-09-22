// backend/src/config/roles.js
const ROLES = {
    STUDENT: 'STUDENT',       // Sinh viên
    MANAGER: 'MANAGER',       // Nhân viên quản lý KTX (Xếp phòng, hợp đồng)
    ACCOUNTANT: 'ACCOUNTANT', // Kế toán (Hóa đơn, thanh toán)
    TECHNICIAN: 'TECHNICIAN', // Kỹ thuật (Sửa chữa, CSVC)
    DIRECTOR: 'DIRECTOR'      // Giám đốc (Full quyền, báo cáo)
};

module.exports = ROLES;