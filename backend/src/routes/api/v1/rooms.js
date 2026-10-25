const express = require('express');
const router = express.Router();
const controller = require('../../../controllers/roomController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo, requirePermission, restrictBuildingAccess } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

router.use(protect);
router.get('/locations', requirePermission('rooms:read'), restrictBuildingAccess, controller.getLocations);
router.post('/buildings', restrictTo(...ROLES.ROOM_PERMISSIONS.write), controller.createBuilding);
router.patch('/buildings/:maToaNha', restrictTo(...ROLES.ROOM_PERMISSIONS.write), restrictBuildingAccess, controller.updateBuilding);
router.delete('/buildings/:maToaNha', restrictTo(...ROLES.ROOM_PERMISSIONS.write), restrictBuildingAccess, controller.deleteBuilding);
router.get('/', requirePermission('rooms:read'), restrictBuildingAccess, controller.getRooms);

router.patch('/:maPhong/members/:maHopDong/move', restrictTo(...ROLES.ROOM_PERMISSIONS.write), restrictBuildingAccess, controller.moveRoomMember);
router.patch('/:maPhong/members/:maHopDong/remove', restrictTo(...ROLES.ROOM_PERMISSIONS.write), restrictBuildingAccess, controller.removeRoomMember);
router.post('/', restrictTo(...ROLES.ROOM_PERMISSIONS.write), restrictBuildingAccess, controller.createRoom);
router.patch('/:maPhong', restrictTo(...ROLES.ROOM_PERMISSIONS.write), restrictBuildingAccess, controller.updateRoom);
router.delete('/:maPhong', restrictTo(...ROLES.ROOM_PERMISSIONS.write), restrictBuildingAccess, controller.deleteRoom);
router.post('/:maPhong/facilities', restrictTo(...ROLES.ROOM_PERMISSIONS.write), restrictBuildingAccess, controller.createFacility);
router.patch('/:maPhong/facilities/:id', restrictTo(...ROLES.ROOM_PERMISSIONS.write), restrictBuildingAccess, controller.updateFacility);
router.delete('/:maPhong/facilities/:id', restrictTo(...ROLES.ROOM_PERMISSIONS.write), restrictBuildingAccess, controller.deleteFacility);

module.exports = router;
