const express = require('express');
const router = express.Router();
const authController = require('../../../controllers/authController');
const passwordResetController = require('../../../controllers/passwordResetController');
const { protect } = require('../../../middleware/authMiddleware');
const { requirePermission, restrictTo } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

// Route Đăng nhập (Public)
router.post('/login', authController.login);
router.post('/forgot-password', passwordResetController.requestReset);
router.post('/reset-password', passwordResetController.confirmReset);
router.get('/me', protect, authController.me);
router.get('/admin-test/accounts', protect, restrictTo(ROLES.ADMIN), authController.listAdminTestAccounts);
router.patch('/me/contact', protect, authController.updateMyContact);
router.patch('/me/password', protect, authController.changeMyPassword);

// Route xem Dashboard dành cho Truong ban, Phó ban và Admin
router.get('/reports/dashboard', protect, requirePermission('dashboard:read'), (req, res) => {
    res.status(200).json({ success: true, message: 'Dữ liệu báo cáo Dashboard' });
});

module.exports = router;
