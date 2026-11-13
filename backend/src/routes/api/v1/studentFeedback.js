const express = require('express');
const router = express.Router();
const controller = require('../../../controllers/studentFeedbackController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo, requirePermission, restrictBuildingAccess } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

router.use(protect);
router.post('/', restrictTo(ROLES.STUDENT, ROLES.MILITARY_STUDENT), requirePermission('feedback:create'), controller.create);
router.get('/', restrictTo(ROLES.FACILITIES_MANAGER), requirePermission('feedback:read'), restrictBuildingAccess, controller.list);

module.exports = router;
