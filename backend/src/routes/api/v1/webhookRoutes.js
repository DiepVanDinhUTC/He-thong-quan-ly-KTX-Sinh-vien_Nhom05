const express = require('express');
const router = express.Router();
const webhookController = require('../../../controllers/webhookController');

// Route: POST /api/v1/webhooks/bank
router.post('/bank', webhookController.handleBankTransfer);

module.exports = router;