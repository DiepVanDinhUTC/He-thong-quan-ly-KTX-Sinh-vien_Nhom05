const express = require('express');
const router = express.Router();
const controller = require('../../../controllers/roomController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo } = require('../../../middleware/rbacMiddleware');

router.use(protect, restrictTo('MANAGER', 'DIRECTOR'));
router.get('/locations', controller.getLocations);
router.get('/', controller.getRooms);
router.patch('/:maPhong/members/:maHopDong/move', controller.moveRoomMember);
router.patch('/:maPhong/members/:maHopDong/remove', controller.removeRoomMember);
router.post('/', controller.createRoom);
router.patch('/:maPhong', controller.updateRoom);
router.delete('/:maPhong', controller.deleteRoom);
router.post('/:maPhong/facilities', controller.createFacility);
router.patch('/:maPhong/facilities/:id', controller.updateFacility);
router.delete('/:maPhong/facilities/:id', controller.deleteFacility);

module.exports = router;
