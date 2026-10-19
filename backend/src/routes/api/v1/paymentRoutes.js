const express = require('express');
const router = express.Router();
const paymentController = require('../../../controllers/paymentController');
const { protect } = require('../../../middleware/authMiddleware');
const { requirePermission, restrictTo, restrictBuildingAccess } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

router.get('/mine', protect, restrictTo(ROLES.STUDENT, ROLES.MILITARY_STUDENT), paymentController.getMyPayments);
router.get('/monthly-invoices', protect, requirePermission('billing:read'), restrictBuildingAccess, paymentController.getMonthlyInvoices);
router.get('/ledger', protect, requirePermission('billing:read'), restrictBuildingAccess, paymentController.listFinancialTransactions);
router.get('/repair-tickets', protect, requirePermission('billing:read'), restrictBuildingAccess, paymentController.getRepairTickets);
router.post('/monthly-invoices/generate', protect, requirePermission('billing:manage'), restrictBuildingAccess, paymentController.generateMonthlyInvoices);
router.post('/monthly-invoices/:invoiceId/collect', protect, requirePermission('billing:manage'), restrictBuildingAccess, paymentController.collectMonthlyInvoice);
router.post('/monthly-invoices/:invoiceId/refunds', protect, requirePermission('billing:manage'), restrictBuildingAccess, paymentController.refundMonthlyInvoice);
router.post('/repair-expenses', protect, requirePermission('billing:manage'), restrictBuildingAccess, paymentController.recordRepairExpense);
router.patch('/ledger/:id/review', protect, requirePermission('billing:manage'), restrictBuildingAccess, paymentController.reviewFinancialTransaction);

// Route: POST /api/v1/payments/:maHopDong/pay
router.post(
    '/:maHopDong/pay', 
    protect, 
    restrictTo(ROLES.ACCOUNTANT, ROLES.TREASURER, ROLES.ADMIN),
    restrictBuildingAccess,
    paymentController.processPayment
);
router.post(
    '/vnpay/create',
    protect,
    restrictTo(ROLES.STUDENT, ROLES.MILITARY_STUDENT),
    paymentController.createVnpayPayment
);

module.exports = router;
