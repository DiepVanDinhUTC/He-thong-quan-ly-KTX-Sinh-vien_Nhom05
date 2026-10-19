const express = require('express');
const router = express.Router();
const { protect } = require('../../../middleware/authMiddleware');
const { requirePermission } = require('../../../middleware/rbacMiddleware');
const controller = require('../../../controllers/militaryManagementController');

router.use(protect);

router.get('/overview', requirePermission('military-students:read'), controller.getOverview);
router.get('/students', requirePermission('military-students:read'), controller.getMilitaryStudents);
router.post('/sis-sync', requirePermission('military-students:sync'), controller.syncMilitaryStudents);

router.get('/rooms', requirePermission('military-rooms:read'), controller.getRooms);
router.post('/room-assignments/auto', requirePermission('military-rooms:assign'), controller.autoAssignRooms);
router.post('/room-assignments', requirePermission('military-rooms:assign'), controller.assignRoom);
router.post('/room-assignments/:id/end', requirePermission('military-rooms:assign'), controller.endRoomAssignment);

router.get('/equipment', requirePermission('military-equipment:read'), controller.getEquipment);
router.post('/equipment', requirePermission('military-equipment:write'), controller.createEquipment);
router.put('/equipment/:id', requirePermission('military-equipment:write'), controller.updateEquipment);
router.post('/equipment/:id/issues', requirePermission('military-equipment:write'), controller.issueEquipment);
router.post('/equipment/issues/:id/return', requirePermission('military-equipment:write'), controller.returnEquipment);

router.get('/meeting-rooms', requirePermission('meeting-rooms:read'), controller.getMeetingRooms);
router.post('/meeting-rooms', requirePermission('meeting-rooms:write'), controller.createMeetingRoom);
router.put('/meeting-rooms/:id', requirePermission('meeting-rooms:write'), controller.updateMeetingRoom);
router.post('/meeting-bookings', requirePermission('meeting-rooms:write'), controller.createMeetingBooking);
router.post('/meeting-bookings/:id/cancel', requirePermission('meeting-rooms:write'), controller.cancelMeetingBooking);

module.exports = router;
