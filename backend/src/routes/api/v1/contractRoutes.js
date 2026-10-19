const express = require('express');
const router = express.Router();

const contractController = require('../../../controllers/contractController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo, restrictBuildingAccess } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

// Contract operations require both an allowed role and access to the room's building.
router.get('/rooms', protect, restrictTo(...ROLES.CONTRACT_READ_ROLES), restrictBuildingAccess, contractController.getRooms);
router.get('/', protect, restrictTo(...ROLES.CONTRACT_READ_ROLES), restrictBuildingAccess, contractController.getContracts);
router.post(
    '/', 
    protect, 
    restrictTo(...ROLES.APPLICATION_DECISION_ROLES),
    restrictBuildingAccess,
    contractController.createContract
);
router.patch('/:id', protect, restrictTo(...ROLES.CONTRACT_EDIT_ROLES), restrictBuildingAccess, contractController.updateContract);

module.exports = router;
