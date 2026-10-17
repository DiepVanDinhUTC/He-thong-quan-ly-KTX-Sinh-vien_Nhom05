const express = require('express');
const router = express.Router();
const paymentController = require('../../../controllers/paymentController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo } = require('../../../middleware/rbacMiddleware');

// Route: POST /api/v1/payments/:maHopDong/pay
router.post(
    '/:maHopDong/pay', 
    protect, 
    restrictTo('ACCOUNTANT', 'DIRECTOR'), // Phân quyền RBAC
    paymentController.processPayment
);
router.get(
    '/:maHopDong/qr',
    protect,
    paymentController.generateQR
);

module.exports = router;