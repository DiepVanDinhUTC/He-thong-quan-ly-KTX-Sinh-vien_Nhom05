const express = require('express');
const router = express.Router();
const controller = require('../../../controllers/studentBillNotificationController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

router.use(protect, restrictTo(ROLES.STUDENT, ROLES.MILITARY_STUDENT));
router.get('/mine', controller.getMine);
router.patch('/mine/read-all', controller.markAllRead);
router.patch('/mine/:id/read', controller.markRead);

module.exports = router;
