const express = require('express');
const router = express.Router();
const studentController = require('../../../controllers/studentController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo, requirePermission, restrictStudentBuildingAccess } = require('../../../middleware/rbacMiddleware');
const ROLES = require('../../../config/roles');

// Endpoint đồng bộ, yêu cầu quyền Admin/Staff theo thiết kế
router.get('/sync', protect, restrictTo(...ROLES.STUDENT_RECORD_PERMISSIONS.sync), studentController.syncData);
router.post('/sync', protect, restrictTo(...ROLES.STUDENT_RECORD_PERMISSIONS.sync), studentController.syncData);

router.use(protect);

const { create: createRoles, update: updateRoles, delete: deleteRoles } = ROLES.STUDENT_RECORD_PERMISSIONS;

router.get('/', requirePermission('students:read'), restrictStudentBuildingAccess, studentController.getAllStudents);
router.post('/', restrictTo(...createRoles), studentController.createStudent);
router.get('/:id', requirePermission('students:read'), restrictStudentBuildingAccess, studentController.getStudentById);
router.put('/:id', restrictTo(...updateRoles), restrictStudentBuildingAccess, studentController.updateStudent);
router.delete('/:id', restrictTo(...deleteRoles), restrictStudentBuildingAccess, studentController.deleteStudent);
    
module.exports = router;
