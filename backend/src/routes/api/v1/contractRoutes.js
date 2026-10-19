const express = require('express');
const router = express.Router();

const contractController = require('../../../controllers/contractController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo, restrictBuildingAccess } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

const contractBuildingScope = (req, res, next) => {
    if ([ROLES.ARCHIVIST, ROLES.ADMIN].includes(req.user.role)) {
        req.buildingScope = null;
        return next();
    }
    return restrictBuildingAccess(req, res, next);
};

// Contract operations require both an allowed role and access to the room's building.
router.get('/rooms', protect, restrictTo(...ROLES.CONTRACT_READ_ROLES), contractBuildingScope, contractController.getRooms);
router.get('/', protect, restrictTo(...ROLES.CONTRACT_READ_ROLES), contractBuildingScope, contractController.getContracts);
router.post(
    '/', 
    protect, 
    restrictTo(...ROLES.APPLICATION_DECISION_ROLES),
    contractBuildingScope,
    contractController.createContract
);
router.patch('/:id', protect, restrictTo(...ROLES.CONTRACT_EDIT_ROLES), contractBuildingScope, contractController.updateContract);

module.exports = router;
