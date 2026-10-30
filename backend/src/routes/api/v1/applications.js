const express = require('express');
const router = express.Router();
const controller = require('../../../controllers/applicationController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

router.use(protect);
router.get('/rooms', restrictTo(ROLES.STUDENT, ROLES.MILITARY_STUDENT), controller.getAvailableRooms);
router.post('/', restrictTo(ROLES.STUDENT), controller.createApplication);
router.get('/mine', restrictTo(ROLES.STUDENT), controller.getMyApplications);
router.get('/', restrictTo(...ROLES.APPLICATION_DECISION_ROLES), controller.getAllApplications);
router.patch('/:id/reject', restrictTo(...ROLES.APPLICATION_DECISION_ROLES), controller.rejectApplication);

module.exports = router;
