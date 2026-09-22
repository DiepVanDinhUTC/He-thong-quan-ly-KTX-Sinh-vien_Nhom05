const express = require('express');
const router = express.Router();
const authController = require('../../../controllers/authController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo } = require('../../../middleware/rbacMiddleware');

// Route Đăng nhập (Public)
router.post('/login', authController.login);

// Ví dụ mô phỏng cách bảo vệ các Route khác theo tài liệu dự án:
// Route dành riêng cho Kế toán (Chốt chỉ số điện nước)
router.post('/bills/meter-readings', protect, restrictTo('ACCOUNTANT'), (req, res) => {
    res.status(200).json({ success: true, message: 'Kế toán truy cập thành công' });
});

// Route dành riêng cho Kỹ thuật và Quản lý chung (Phân công xử lý ticket)
router.patch('/tickets/:id/assign', protect, restrictTo('TECH', 'STAFF'), (req, res) => {
    res.status(200).json({ success: true, message: 'Điều phối ticket thành công' });
});

// Route xem Dashboard dành cho Giám đốc
router.get('/reports/dashboard', protect, restrictTo('DIRECTOR'), (req, res) => {
    res.status(200).json({ success: true, message: 'Dữ liệu báo cáo Dashboard' });
});

module.exports = router;