const express = require('express');
const router = express.Router();
const controller = require('../../../controllers/applicationController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo } = require('../../../middleware/rbacMiddleware');

router.use(protect);
router.get('/rooms', restrictTo('STUDENT'), controller.getAvailableRooms);
router.post('/', restrictTo('STUDENT'), controller.createApplication);
router.get('/mine', restrictTo('STUDENT'), controller.getMyApplications);
router.get('/', restrictTo('MANAGER', 'DIRECTOR'), controller.getAllApplications);
router.patch('/:id/reject', restrictTo('MANAGER', 'DIRECTOR'), controller.rejectApplication);

module.exports = router;
