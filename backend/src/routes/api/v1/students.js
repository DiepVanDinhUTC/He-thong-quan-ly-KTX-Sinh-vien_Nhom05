const express = require('express');
const router = express.Router();
const studentController = require('../../../controllers/studentController');
const { protect } = require('../../../middleware/authMiddleware');
const { restrictTo } = require('../../../middleware/rbacMiddleware');

// Endpoint đồng bộ, yêu cầu quyền Admin/Staff theo thiết kế
router.get('/sync', protect, restrictTo('STAFF', 'DIRECTOR'), studentController.syncData);

// Chỉ Ban quản lý (STAFF) và Giám đốc (DIRECTOR) mới có quyền CRUD hồ sơ
router.use(protect); // Áp dụng xác thực cho toàn bộ route phía dưới
router.use(restrictTo('STAFF', 'DIRECTOR'));

// Tuyến đường cho US-10 (Đã làm trước đó)
router.get('/sync', studentController.syncData);

// Các tuyến đường CRUD cho US-02
router.route('/')
    .get(studentController.getAllStudents)    // GET /api/v1/students -> Lấy danh sách
    .post(studentController.createStudent);   // POST /api/v1/students -> Thêm mới

router.route('/:id')
    .get(studentController.getStudentById)    // GET /api/v1/students/20120001 -> Xem chi tiết
    .put(studentController.updateStudent)     // PUT /api/v1/students/20120001 -> Cập nhật
    .delete(studentController.deleteStudent); // DELETE /api/v1/students/20120001 -> Xóa
    
module.exports = router;