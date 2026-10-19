const express = require('express');
const router = express.Router();
const staffAccountController = require('../../../controllers/staffAccountController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

const managers = [ROLES.BOARD_CHAIR, ROLES.BOARD_DEPUTY, ROLES.ADMIN];

router.use(protect, restrictTo(...managers));
router.get('/', staffAccountController.listStaffAccounts);
router.patch('/:maNhanVien', staffAccountController.updateStaffAccount);
router.patch('/:maNhanVien/password', staffAccountController.changeStaffPassword);

module.exports = router;
