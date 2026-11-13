const express = require('express');
const router = express.Router();
const controller = require('../../../controllers/roomHousekeepingController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo, requirePermission, restrictBuildingAccess } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

router.use(protect);
router.get('/', restrictTo(ROLES.FACILITIES_MANAGER), requirePermission('housekeeping:read'), restrictBuildingAccess, controller.list);
router.post('/', restrictTo(ROLES.FACILITIES_MANAGER), requirePermission('housekeeping:create'), restrictBuildingAccess, controller.create);
router.patch('/:id', restrictTo(ROLES.FACILITIES_MANAGER), requirePermission('housekeeping:update'), restrictBuildingAccess, controller.update);

module.exports = router;
