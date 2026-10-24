const express = require('express');
const router = express.Router();
const controller = require('../../../controllers/studentSelfServiceController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo, requirePermission } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

const studentRoles = [ROLES.STUDENT, ROLES.MILITARY_STUDENT];
const housingDeciders = [...new Set(Object.values(ROLES.HOUSING_REQUEST_DECISION_ROLES).flat())];
const serviceManagers = [ROLES.SERVICE_PROVIDER, ROLES.BUILDING_MANAGER, ROLES.ADMIN];

router.use(protect);

router.get('/housing-requests/mine', restrictTo(ROLES.STUDENT), controller.myHousingRequests);
router.post('/housing-requests', restrictTo(ROLES.STUDENT), controller.createHousingRequest);
router.get('/housing-requests', restrictTo(...ROLES.HOUSING_REQUEST_READ_ROLES), controller.listHousingRequests);
router.patch('/housing-requests/:id', restrictTo(...housingDeciders), controller.decideHousingRequest);

router.get('/services/mine', restrictTo(...studentRoles), controller.myServiceRegistrations);
router.post('/services', restrictTo(...studentRoles), controller.createServiceRegistration);
router.patch('/services/:id/cancel', restrictTo(...studentRoles), controller.cancelServiceRegistration);
router.get('/services', restrictTo(...serviceManagers), requirePermission('services:read'), controller.listServiceRegistrations);
router.patch('/services/:id', restrictTo(...serviceManagers), requirePermission('services:update'), controller.decideServiceRegistration);

module.exports = router;
