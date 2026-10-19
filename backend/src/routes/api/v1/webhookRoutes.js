const express = require('express');
const router = express.Router();
const webhookController = require('../../../controllers/webhookController');
const paymentController = require('../../../controllers/paymentController');

// Route: POST /api/v1/webhooks/bank
router.post('/bank', webhookController.handleBankTransfer);
router.get('/vnpay-ipn', paymentController.handleVnpayIpn);

module.exports = router;
