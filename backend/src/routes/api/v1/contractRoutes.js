const express = require('express');
const router = express.Router();

const contractController = require('../../../controllers/contractController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

// Nghiệp vụ Lập hợp đồng chỉ dành cho Quản lý KTX và Giám đốc
router.post(
    '/', 
    protect, 
    restrictTo(ROLES.MANAGER, ROLES.DIRECTOR), 
    contractController.createContract
);

module.exports = router;