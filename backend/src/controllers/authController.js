const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { deriveStudentHousingStatus } = require('../services/studentHousingStatus');
const { isPriorityStudent } = require('../services/studentPriority');
const { roomMemberRelations, getRoomOccupancy } = require('../services/roomOccupancy');
const { getMilitaryStayPeriod, militaryStayState } = require('../services/militaryStay');
const ROLES = require('../config/roles');
const { KNOWN_ROLES, ROLE_LABELS } = ROLES;

const studentProfileInclude = {
    hopDongs: {
        where: { trangThai: { in: ['PENDING_PAYMENT', 'ACTIVE'] } },
        include: {
            phong: {
                include: roomMemberRelations
            }
        },
        orderBy: { ngayTao: 'desc' }
    },
    dangKyKTXs: { orderBy: { ngayDangKy: 'desc' }, take: 1 },
    militaryRoomAssignments: {
        orderBy: { assignedAt: 'desc' }, take: 5,
        include: { phong: { include: roomMemberRelations } }
    }
};

const serializePlacement = (placement, now = new Date()) => placement ? {
    maHopDong: placement.maHopDong || null,
    maPhanPhong: placement.maPhanPhong || null,
    source: placement.source || 'CONTRACT', maPhong: placement.maPhong,
    soPhong: placement.phong?.soPhong || null,
    tenToaNha: placement.phong?.toaNha?.tenToaNha || placement.phong?.maToaNha || null,
    loaiPhong: placement.phong?.loaiPhong || null,
    phiNoiTruThang: placement.source === 'MILITARY' ? null : placement.phong?.phiNoiTruThang ?? null,
    ngayBatDau: placement.ngayBatDau, ngayKetThuc: placement.ngayKetThuc,
    tongTien: placement.tongTien ?? null, trangThai: placement.trangThai,
    thanhVien: getRoomOccupancy(placement.phong || {}, now).thanhVien.map((member) => ({
        maHopDong: member.maHopDong, maPhanPhong: member.maPhanPhong || null, source: member.source,
        maSV: member.maSV, hoTen: member.hoTen, nienKhoa: member.nienKhoa
    }))
} : null;

const serializeUser = (account, now = new Date()) => {
    const student = account.sinhVien;
    const employee = account.nhanVien;
    const currentContract = student?.hopDongs?.find((contract) => ['PENDING_PAYMENT', 'ACTIVE'].includes(contract.trangThai));
    const assignments = student?.militaryRoomAssignments || [];
    const militaryAssignment = assignments.find((item) => militaryStayState(item, now) === 'ACTIVE')
        || assignments.find((item) => militaryStayState(item, now) === 'UPCOMING') || assignments[0];
    const stayState = militaryAssignment ? militaryStayState(militaryAssignment, now) : null;
    const period = militaryAssignment ? getMilitaryStayPeriod(militaryAssignment) : null;
    const militaryPlacement = militaryAssignment ? {
        maHopDong: null, maPhanPhong: militaryAssignment.id, source: 'MILITARY',
        maPhong: militaryAssignment.maPhong, phong: militaryAssignment.phong,
        ngayBatDau: period.startsAt, ngayKetThuc: period.endsAt,
        tongTien: null, trangThai: 'MILITARY_ASSIGNED'
    } : null;
    const currentPlacement = stayState === 'ACTIVE' ? militaryPlacement : currentContract;
    const latestApplication = student?.dangKyKTXs?.[0];

    return {
        id: student?.maSV || employee?.maNhanVien || account.id,
        username: account.username,
        hoTen: student?.hoTen || employee?.hoTen || account.username,
        role: account.role,
        laHocVienQuanSu: Boolean(student?.laHocVienQuanSu || account.role === 'MILITARY_STUDENT'),
        militaryStay: militaryPlacement ? { ...serializePlacement(militaryPlacement, now), state: stayState, batchCode: militaryAssignment.batchCode || null } : null,
        currentResidence: serializePlacement(currentPlacement, now),
        maSV: student?.maSV || null,
        maNhanVien: employee?.maNhanVien || null,
        chucVu: employee?.chucVu || null,
        ngaySinh: student?.ngaySinh || null,
        gioiTinh: student?.gioiTinh ?? null,
        lop: student?.lop || null,
        nienKhoa: student?.nienKhoa || null,
        khoa: student?.khoa || null,
        dienUuTien: student?.dienUuTien ?? null,
        isPriority: isPriorityStudent(student),
        email: student?.email || employee?.email || null,
        phone: student?.phone || employee?.phone || null,
        trangThaiNoiTru: stayState === 'ACTIVE' ? 'DANG_O' : student ? deriveStudentHousingStatus(
            student.hopDongs || [],
            latestApplication?.trangThai === 'PENDING'
        ) : null,
        maPhong: currentPlacement?.phong?.maPhong || null,
        soPhong: currentPlacement?.phong?.soPhong || null,
        ngayKetThucHopDong: currentContract?.ngayKetThuc || null,
        currentContract: serializePlacement(currentContract, now),
        latestApplication: latestApplication ? {
            maDangKy: latestApplication.maDangKy,
            loaiPhongYeuCau: latestApplication.loaiPhongYeuCau,
            ngayDangKy: latestApplication.ngayDangKy,
            trangThai: latestApplication.trangThai
        } : null
    };
};

exports.serializeUser = serializeUser;

const generateToken = (id, role) => jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
);

const isDatabaseUnavailable = (error) => (
    ['P1001', 'P1002', 'P1017', 'P2024'].includes(error.code)
    || /can't reach database server|timed out|connection.*closed/i.test(error.message || '')
);

const sendAuthServerError = (res, error, action) => {
    console.error(`[auth.${action}] ${error.code || 'ERROR'}: ${error.message}`);
    if (isDatabaseUnavailable(error)) {
        return res.status(503).json({
            success: false,
            message: 'Backend không kết nối được cơ sở dữ liệu. Hãy kiểm tra DATABASE_URL và trạng thái Supabase rồi thử lại.'
        });
    }
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi xác thực. Vui lòng thử lại sau.' });
};

exports.login = async (req, res) => {
    const { username, email, password } = req.body;
    const loginName = username || email;

    if (!loginName || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu.' });
    }

    try {
        const account = await prisma.user.findUnique({
            where: { username: loginName },
            include: { sinhVien: { include: studentProfileInclude }, nhanVien: true }
        });

        if (!account || !account.isActive) {
            return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị khóa.' });
        }

        if (!(await bcrypt.compare(password, account.password))) {
            return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác.' });
        }

        if (!KNOWN_ROLES.has(account.role)) {
            return res.status(403).json({ success: false, message: 'Tài khoản chưa được gán vai trò hợp lệ. Vui lòng liên hệ quản trị viên.' });
        }

        const user = serializeUser(account);

        return res.status(200).json({
            success: true,
            token: generateToken(account.id, account.role),
            user,
            data: user
        });
    } catch (error) {
        return sendAuthServerError(res, error, 'login');
    }
};

exports.me = async (req, res) => {
    try {
        const account = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { sinhVien: { include: studentProfileInclude }, nhanVien: true }
        });

        if (!account || !account.isActive) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản đang đăng nhập.' });
        }

        return res.status(200).json({ success: true, user: serializeUser(account) });
    } catch (error) {
        return sendAuthServerError(res, error, 'me');
    }
};

exports.listAdminTestAccounts = async (req, res) => {
    if (req.authUser?.role !== ROLES.ADMIN) {
        return res.status(403).json({ success: false, message: 'Chỉ ADMIN mới được xem tài khoản kiểm thử.' });
    }
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'production' && process.env.ALLOW_ADMIN_ROLE_TESTING !== 'true') {
        return res.status(403).json({ success: false, message: 'Chế độ kiểm thử vai trò đang bị tắt trên production.' });
    }

    try {
        const studentRoles = [ROLES.STUDENT, ROLES.MILITARY_STUDENT];
        const employeeRoles = [...KNOWN_ROLES].filter((role) => role !== ROLES.ADMIN && !studentRoles.includes(role));
        const accounts = await prisma.user.findMany({
            where: {
                isActive: true,
                OR: [
                    { role: { in: studentRoles }, sinhVien: { isNot: null } },
                    { role: { in: employeeRoles }, nhanVien: { isNot: null } }
                ]
            },
            select: {
                username: true,
                role: true,
                sinhVien: { select: { hoTen: true } },
                nhanVien: { select: { hoTen: true } }
            },
            orderBy: [{ role: 'asc' }, { username: 'asc' }],
            take: 1000
        });
        return res.status(200).json({
            success: true,
            data: accounts.map((account) => ({
                username: account.username,
                role: account.role,
                roleLabel: ROLE_LABELS[account.role] || account.role,
                displayName: account.sinhVien?.hoTen || account.nhanVien?.hoTen || account.username
            }))
        });
    } catch (error) {
        console.error(`[auth.adminTestAccounts] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách tài khoản kiểm thử.' });
    }
};

exports.updateMyContact = async (req, res) => {
    if (![ROLES.STUDENT, ROLES.MILITARY_STUDENT].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Chức năng này chỉ dành cho sinh viên và học viên quân sự.' });
    const email = String(req.body.email || '').trim();
    const phone = String(req.body.phone || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
        return res.status(400).json({ success: false, message: 'Địa chỉ email không hợp lệ.' });
    }
    if (!/^\+?[0-9\s().-]{9,15}$/.test(phone) || phone.replace(/\D/g, '').length < 9 || phone.replace(/\D/g, '').length > 15) {
        return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ.' });
    }
    try {
        await prisma.sinhVien.update({ where: { userId: req.user.id }, data: { email, phone } });
        const account = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { sinhVien: { include: studentProfileInclude }, nhanVien: true }
        });
        return res.status(200).json({ success: true, message: 'Đã cập nhật thông tin liên lạc.', user: serializeUser(account) });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ sinh viên.' });
        return res.status(500).json({ success: false, message: 'Không thể cập nhật thông tin liên lạc.' });
    }
};

exports.changeMyPassword = async (req, res) => {
    if (![ROLES.STUDENT, ROLES.MILITARY_STUDENT].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Chức năng này chỉ dành cho sinh viên và học viên quân sự.' });
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
        return res.status(400).json({ success: false, message: 'Mật khẩu mới cần có từ 8 đến 128 ký tự.' });
    }
    try {
        const account = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!account || !await bcrypt.compare(currentPassword, account.password)) {
            return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác.' });
        }
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({ where: { id: account.id }, data: { password: passwordHash } });
        return res.status(200).json({ success: true, message: 'Đã đổi mật khẩu.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể đổi mật khẩu.' });
    }
};
