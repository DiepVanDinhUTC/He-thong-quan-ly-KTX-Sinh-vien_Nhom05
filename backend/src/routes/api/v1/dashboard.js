const router = require('express').Router();
const { protect } = require('../../../middleware/authMiddleware');
const { requirePermission } = require('../../../middleware/rbacMiddleware');
const { overview } = require('../../../controllers/dashboardController');

router.get('/', protect, requirePermission('dashboard:read'), overview);

module.exports = router;
