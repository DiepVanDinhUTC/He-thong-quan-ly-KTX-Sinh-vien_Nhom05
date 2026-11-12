const syncStudentService = require('../services/syncStudentService');
const prisma = require('../config/prisma');
const { deriveStudentHousingStatus } = require('../services/studentHousingStatus');
const { isPriorityStudent, sortByStudentPriority } = require('../services/studentPriority');
const { militaryStayState } = require('../services/militaryStay');
const { buildingRoomFilter, housingContractFilter, residentInBuildings } = require('../services/studentResidenceScope');

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
const studentRelations = (buildingScope, now) => ({
    hopDongs: { where: housingContractFilter(buildingScope), include: { phong: true }, orderBy: { ngayTao: 'desc' }, take: 1 },
    dangKyKTXs: { where: { trangThai: 'PENDING' }, select: { maDangKy: true }, take: 1 },
    militaryRoomAssignments: {
        where: { status: 'ACTIVE', endsAt: { gt: now }, ...buildingRoomFilter(buildingScope) },
        orderBy: { startsAt: 'asc' },
        select: { id: true, status: true, startsAt: true, endsAt: true, phong: { select: { maPhong: true, soPhong: true, maToaNha: true } } }
    }
});
const presentStudent = (student, now) => {
    const { militaryRoomAssignments = [], ...fields } = student;
    const current = militaryRoomAssignments.find((item) => militaryStayState(item, now) === 'ACTIVE');
    const upcoming = militaryRoomAssignments.find((item) => militaryStayState(item, now) === 'UPCOMING');
    return {
        ...fields,
        isPriority: isPriorityStudent(student),
        phongHienTai: current ? { ...current.phong, source: 'MILITARY' } : student.hopDongs?.[0]?.phong ? { ...student.hopDongs[0].phong, source: 'CONTRACT' } : null,
        phongQuanSuSapToi: upcoming ? { ...upcoming.phong, startsAt: upcoming.startsAt, endsAt: upcoming.endsAt } : null,
        trangThaiNoiTru: current ? 'DANG_O' : deriveStudentHousingStatus(student.hopDongs || [], Boolean(student.dangKyKTXs?.length))
    };
};

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
        const now = new Date();
        const where = req.buildingScope === null ? undefined : residentInBuildings(req.buildingScope, now);
        const students = await prisma.sinhVien.findMany({
            where,
            orderBy: { maSV: 'desc' },
            include: studentRelations(req.buildingScope, now)
        });
        return res.status(200).json({ success: true, data: sortByStudentPriority(students).map((student) => presentStudent(student, now)) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sinh viên', error: error.message });
    }
};

exports.getStudentById = async (req, res) => {
    try {
        const now = new Date();
        const student = await prisma.sinhVien.findUnique({
            where: { maSV: req.params.id },
            include: studentRelations(req.buildingScope, now)
        });
        if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên.' });
        return res.status(200).json({ success: true, data: presentStudent(student, now) });
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
