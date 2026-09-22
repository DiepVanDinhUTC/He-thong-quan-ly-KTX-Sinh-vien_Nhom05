const syncStudentService = require('../services/syncStudentService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.syncData = async (req, res) => {
    try {
        const result = await syncStudentService.syncStudentsFromSis();
        res.status(200).json({
            success: true,
            message: `Đã đồng bộ thành công ${result.count} sinh viên từ sis.utc`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};
// [READ] Lấy danh sách toàn bộ sinh viên (Có thể thêm phân trang, tìm kiếm sau)
exports.getAllStudents = async (req, res) => {
    try {
        const students = await prisma.sinhVien.findMany({
            orderBy: { maSV: 'desc' }
        });
        res.status(200).json({ success: true, data: students });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sinh viên', error: error.message });
    }
};

// [READ] Lấy thông tin chi tiết 1 sinh viên theo maSV
exports.getStudentById = async (req, res) => {
    try {
        const student = await prisma.sinhVien.findUnique({
            where: { maSV: req.params.id }
        });
        if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên!' });
        
        res.status(200).json({ success: true, data: student });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// [CREATE] Thêm mới một hồ sơ sinh viên thủ công
exports.createStudent = async (req, res) => {
    try {
        const newStudent = await prisma.sinhVien.create({
            data: req.body // req.body chứa maSV, hoTen, ngaySinh, cccd... gửi từ form Frontend
        });
        res.status(201).json({ success: true, message: 'Thêm sinh viên thành công', data: newStudent });
    } catch (error) {
        // Lỗi P2002 của Prisma là lỗi trùng lặp khóa chính (unique constraint)
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'Mã sinh viên hoặc CCCD đã tồn tại!' });
        }
        res.status(500).json({ success: false, message: 'Lỗi khi thêm sinh viên', error: error.message });
    }
};

// [UPDATE] Cập nhật thông tin sinh viên
exports.updateStudent = async (req, res) => {
    try {
        const updatedStudent = await prisma.sinhVien.update({
            where: { maSV: req.params.id },
            data: req.body
        });
        res.status(200).json({ success: true, message: 'Cập nhật thành công', data: updatedStudent });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông tin', error: error.message });
    }
};

// [DELETE] Xóa hồ sơ sinh viên
exports.deleteStudent = async (req, res) => {
    try {
        await prisma.sinhVien.delete({
            where: { maSV: req.params.id }
        });
        res.status(200).json({ success: true, message: 'Đã xóa hồ sơ sinh viên thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi xóa hồ sơ', error: error.message });
    }
};