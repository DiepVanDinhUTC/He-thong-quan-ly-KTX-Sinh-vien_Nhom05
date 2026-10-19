const express = require('express');
const router = express.Router();
const controller = require('../../../controllers/ticketController');
const { protect } = require('../../../middleware/authMiddleware');
const { requirePermission, restrictTo, restrictBuildingAccess } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

router.use(protect);

router.get('/mine', restrictTo(ROLES.STUDENT, ROLES.MILITARY_STUDENT), controller.mine);
router.get('/mine/:id', restrictTo(ROLES.STUDENT, ROLES.MILITARY_STUDENT), controller.mineDetail);
router.patch('/mine/:id/acceptance', restrictTo(ROLES.STUDENT, ROLES.MILITARY_STUDENT), requirePermission('tickets:accept-own'), controller.studentAcceptCompletion);
router.patch('/mine/:id/request-rework', restrictTo(ROLES.STUDENT, ROLES.MILITARY_STUDENT), requirePermission('tickets:accept-own'), controller.studentRequestRework);
router.post('/', restrictTo(ROLES.STUDENT, ROLES.MILITARY_STUDENT), controller.create);
router.get('/', requirePermission('tickets:read'), restrictBuildingAccess, controller.list);
router.get('/:id', requirePermission('tickets:read'), restrictBuildingAccess, controller.detail);
router.patch('/:id/approve', requirePermission('tickets:approve'), restrictBuildingAccess, controller.approve);
router.patch('/:id/reject', requirePermission('tickets:approve'), restrictBuildingAccess, controller.reject);
router.patch('/:id/assign', requirePermission('tickets:assign'), restrictBuildingAccess, controller.assign);
router.patch('/:id/schedule', requirePermission('tickets:schedule'), restrictBuildingAccess, controller.schedule);
router.patch('/:id/progress', requirePermission('tickets:update'), restrictBuildingAccess, controller.progress);
router.patch('/:id/completion', requirePermission('tickets:complete'), restrictBuildingAccess, controller.submitCompletion);
router.patch('/:id/compensation', requirePermission('tickets:assess-compensation'), restrictBuildingAccess, controller.assessCompensation);
router.patch('/:id/accept-completion', requirePermission('tickets:accept-completion'), restrictBuildingAccess, controller.acceptCompletion);

module.exports = router;
