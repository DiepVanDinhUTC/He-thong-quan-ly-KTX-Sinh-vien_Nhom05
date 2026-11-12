const express = require('express');
const router = express.Router();
const controller = require('../../../controllers/utilityController');
const militaryUtility = require('../../../controllers/militaryUtilityController');
const { protect } = require('../../../middleware/authMiddleware');
const { requirePermission, restrictBuildingAccess } = require('../../../middleware/rbacMiddleware');

router.use(protect);
router.get('/meter-readings', requirePermission('utilities:read'), restrictBuildingAccess, controller.listMeterReadings);
router.get('/military-periods', requirePermission('utilities:read'), restrictBuildingAccess, militaryUtility.list);
router.post('/military-periods/:assignmentId', requirePermission('utilities:write'), restrictBuildingAccess, militaryUtility.record);
router.post('/rooms/:maPhong/meter-readings', requirePermission('utilities:write'), restrictBuildingAccess, controller.recordMeterReading);

module.exports = router;
