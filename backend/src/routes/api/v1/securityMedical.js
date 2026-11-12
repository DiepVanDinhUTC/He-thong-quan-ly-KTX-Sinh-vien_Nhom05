const express = require('express');
const controller = require('../../../controllers/securityMedicalController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo, requirePermission, restrictBuildingAccess } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

const router = express.Router();
router.use(protect);

const allowAllBuildings = (req, res, next) => {
    req.buildingScope = null;
    return next();
};

const residentDirectoryScope = (req, res, next) => {
    if ([ROLES.MEDICAL_OFFICER, ROLES.ARCHIVIST, ROLES.ADMIN].includes(req.user.role) || (req.user.role === ROLES.SECURITY && req.query.scope !== 'assigned')) {
        return allowAllBuildings(req, res, next);
    }
    return restrictBuildingAccess(req, res, next);
};

router.get(
    '/residents',
    restrictTo(ROLES.SECURITY, ROLES.MEDICAL_OFFICER, ROLES.ARCHIVIST, ROLES.ADMIN),
    requirePermission('residents:read'),
    residentDirectoryScope,
    controller.getResidents
);

router.get(
    '/access-logs',
    restrictTo(ROLES.SECURITY, ROLES.ADMIN),
    requirePermission('security:access-log:read'),
    allowAllBuildings,
    controller.listAccessLogs
);
router.post(
    '/access-logs',
    restrictTo(ROLES.SECURITY, ROLES.ADMIN),
    requirePermission('security:access-log:create'),
    allowAllBuildings,
    controller.createAccessLog
);
router.patch(
    '/access-logs/:accessLogId/checkout',
    restrictTo(ROLES.SECURITY, ROLES.ADMIN),
    requirePermission('security:access-log:checkout'),
    allowAllBuildings,
    controller.checkoutAccessLog
);

router.get(
    '/violations',
    restrictTo(ROLES.SECURITY, ROLES.ARCHIVIST, ROLES.ADMIN),
    requirePermission('security:violation:read'),
    residentDirectoryScope,
    controller.listViolations
);
router.post(
    '/violations',
    restrictTo(ROLES.SECURITY, ROLES.ADMIN),
    requirePermission('security:violation:create'),
    residentDirectoryScope,
    controller.createViolation
);

router.get('/violation-summary', restrictTo(ROLES.ARCHIVIST, ROLES.ADMIN), requirePermission('security:violation:read'), controller.violationSummary);

router.get(
    '/health-records',
    restrictTo(ROLES.MEDICAL_OFFICER, ROLES.ADMIN),
    requirePermission('medical:records:read'),
    allowAllBuildings,
    controller.listHealthRecords
);
router.get(
    '/health-records/:maSV',
    restrictTo(ROLES.MEDICAL_OFFICER, ROLES.ADMIN),
    requirePermission('medical:records:read'),
    allowAllBuildings,
    controller.getHealthRecord
);
router.put(
    '/health-records/:maSV',
    restrictTo(ROLES.MEDICAL_OFFICER, ROLES.ADMIN),
    requirePermission('medical:records:write'),
    allowAllBuildings,
    controller.saveHealthRecord
);

router.get(
    '/medical-incidents',
    restrictTo(ROLES.MEDICAL_OFFICER, ROLES.ADMIN),
    requirePermission('medical:incidents:read'),
    allowAllBuildings,
    controller.listMedicalIncidents
);
router.post(
    '/medical-incidents',
    restrictTo(ROLES.MEDICAL_OFFICER, ROLES.ADMIN),
    requirePermission('medical:incidents:create'),
    allowAllBuildings,
    controller.createMedicalIncident
);

module.exports = router;
