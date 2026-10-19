const express = require('express');
const router = express.Router();
const controller = require('../../../controllers/utilityController');
const { protect } = require('../../../middleware/authMiddleware');
const { requirePermission, restrictBuildingAccess } = require('../../../middleware/rbacMiddleware');

router.use(protect);
router.get('/meter-readings', requirePermission('utilities:read'), restrictBuildingAccess, controller.listMeterReadings);
router.post('/rooms/:maPhong/meter-readings', requirePermission('utilities:write'), restrictBuildingAccess, controller.recordMeterReading);

module.exports = router;
