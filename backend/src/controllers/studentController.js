const syncStudentService = require('../services/syncStudentService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { deriveStudentHousingStatus } = require('../services/studentHousingStatus');

const editableFields = [
    'hoTen', 'ngaySinh', 'gioiTinh', 'lop', 'nienKhoa', 'khoa', 'cccd',
    'phone', 'email', 'dienUuTien'
];
const requiredFields = ['maSV', ...editableFields.filter((field) => field !== 'dienUuTien')];

const pickStudentFields = (body) => Object.fromEntries(
    editableFields
        .filter((field) => body[field] !== undefined)
        .map((field) => [field, body[field]])
);

const validCohorts = ['K62', 'K63', 'K64', 'K65', 'K66', 'K67'];
const invalidCohort = (body) => body.nienKhoa !== undefined && !validCohorts.includes(body.nienKhoa);
const presentStudent = (student) => ({
    ...student,
    trangThaiNoiTru: deriveStudentHousingStatus(student.hopDongs || [], Boolean(student.dangKyKTXs?.length))
});

exports.syncData = async (req, res) => {
    try {
        const result = await syncStudentService.syncStudentsFromSis();
        return res.status(200).json({
            success: true,
            message: `Đã đồng bộ từ trường ${result.count} hồ sơ sinh viên thành công${result.createdAccounts ? `, tạo ${result.createdAccounts} tài khoản mới` : ''}.`,
            data: result
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllStudents = async (req, res) => {
    try {
        const students = await prisma.sinhVien.findMany({
            orderBy: { maSV: 'desc' },
            include: {
                hopDongs: { where: { trangThai: { in: ['ACTIVE', 'PENDING_PAYMENT'] } }, include: { phong: true }, orderBy: { ngayTao: 'desc' }, take: 1 },
                dangKyKTXs: { where: { trangThai: 'PENDING' }, select: { maDangKy: true }, take: 1 }
            }
        });
        return res.status(200).json({ success: true, data: students.map(presentStudent) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sinh viên', error: error.message });
    }
};

exports.getStudentById = async (req, res) => {
    try {
        const student = await prisma.sinhVien.findUnique({
            where: { maSV: req.params.id },
            include: {
                hopDongs: { where: { trangThai: { in: ['ACTIVE', 'PENDING_PAYMENT'] } }, include: { phong: true }, orderBy: { ngayTao: 'desc' }, take: 1 },
                dangKyKTXs: { where: { trangThai: 'PENDING' }, select: { maDangKy: true }, take: 1 }
            }
        });
        if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên.' });
        return res.status(200).json({ success: true, data: presentStudent(student) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.createStudent = async (req, res) => {
    if (invalidCohort(req.body)) return res.status(400).json({ success: false, message: 'Niên khóa phải nằm trong khoảng K62 đến K67.' });
    const missing = requiredFields.filter((field) => req.body[field] === undefined || req.body[field] === '');
    if (missing.length) {
        return res.status(400).json({ success: false, message: `Thiếu thông tin bắt buộc: ${missing.join(', ')}` });
    }

    try {
        const student = await prisma.sinhVien.create({
            data: { maSV: req.body.maSV, ...pickStudentFields(req.body) }
        });
        return res.status(201).json({ success: true, message: 'Thêm sinh viên thành công', data: student });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'Mã sinh viên hoặc CCCD đã tồn tại.' });
        }
        return res.status(500).json({ success: false, message: 'Lỗi khi thêm sinh viên', error: error.message });
    }
};

exports.updateStudent = async (req, res) => {
    if (invalidCohort(req.body)) return res.status(400).json({ success: false, message: 'Niên khóa phải nằm trong khoảng K62 đến K67.' });
    try {
        const student = await prisma.sinhVien.update({
            where: { maSV: req.params.id },
            data: pickStudentFields(req.body)
        });
        return res.status(200).json({ success: true, message: 'Cập nhật thành công', data: student });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên.' });
        if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'CCCD đã tồn tại.' });
        return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông tin', error: error.message });
    }
};

exports.deleteStudent = async (req, res) => {
    try {
        await prisma.sinhVien.delete({ where: { maSV: req.params.id } });
        return res.status(200).json({ success: true, message: 'Đã xóa hồ sơ sinh viên thành công.' });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên.' });
        if (error.code === 'P2003') {
            return res.status(409).json({ success: false, message: 'Sinh viên đang có hợp đồng hoặc đăng ký KTX nên không thể xóa.' });
        }
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa hồ sơ', error: error.message });
    }
};
