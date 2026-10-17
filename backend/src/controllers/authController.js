const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { deriveStudentHousingStatus } = require('../services/studentHousingStatus');

const studentProfileInclude = {
    hopDongs: {
        where: { trangThai: { in: ['PENDING_PAYMENT', 'ACTIVE'] } },
        include: {
            phong: {
                include: {
                    hopDongs: {
                        where: { trangThai: { in: ['PENDING_PAYMENT', 'ACTIVE'] } },
                        include: { sinhVien: { select: { maSV: true, hoTen: true, nienKhoa: true } } },
                        orderBy: { ngayTao: 'asc' }
                    }
                }
            }
        },
        orderBy: { ngayTao: 'desc' }
    },
    dangKyKTXs: { orderBy: { ngayDangKy: 'desc' }, take: 1 }
};

const serializeUser = (account) => {
    const student = account.sinhVien;
    const employee = account.nhanVien;
    const currentContract = student?.hopDongs?.find((contract) => ['PENDING_PAYMENT', 'ACTIVE'].includes(contract.trangThai));
    const latestApplication = student?.dangKyKTXs?.[0];

    return {
        id: student?.maSV || employee?.maNhanVien || account.id,
        username: account.username,
        hoTen: student?.hoTen || employee?.hoTen || account.username,
        role: account.role,
        maSV: student?.maSV || null,
        maNhanVien: employee?.maNhanVien || null,
        chucVu: employee?.chucVu || null,
        ngaySinh: student?.ngaySinh || null,
        gioiTinh: student?.gioiTinh ?? null,
        lop: student?.lop || null,
        nienKhoa: student?.nienKhoa || null,
        khoa: student?.khoa || null,
        email: student?.email || employee?.email || null,
        phone: student?.phone || employee?.phone || null,
        trangThaiNoiTru: student ? deriveStudentHousingStatus(
            student.hopDongs || [],
            latestApplication?.trangThai === 'PENDING'
        ) : null,
        maPhong: currentContract?.phong?.maPhong || null,
        soPhong: currentContract?.phong?.soPhong || null,
        ngayKetThucHopDong: currentContract?.ngayKetThuc || null,
        currentContract: currentContract ? {
            maHopDong: currentContract.maHopDong,
            maPhong: currentContract.maPhong,
            soPhong: currentContract.phong?.soPhong || null,
            loaiPhong: currentContract.phong?.loaiPhong || null,
            ngayBatDau: currentContract.ngayBatDau,
            ngayKetThuc: currentContract.ngayKetThuc,
            tongTien: currentContract.tongTien,
            trangThai: currentContract.trangThai,
            thanhVien: currentContract.phong?.hopDongs?.map((contract) => {
                return {
                    maHopDong: contract.maHopDong,
                    maSV: contract.sinhVien?.maSV || contract.maSinhVien,
                    hoTen: contract.sinhVien?.hoTen || null,
                    nienKhoa: contract.sinhVien?.nienKhoa || null
                };
            }) || []
        } : null,
        latestApplication: latestApplication ? {
            maDangKy: latestApplication.maDangKy,
            loaiPhongYeuCau: latestApplication.loaiPhongYeuCau,
            ngayDangKy: latestApplication.ngayDangKy,
            trangThai: latestApplication.trangThai
        } : null
    };
};

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
            message: 'Backend không kết nối được cơ sở dữ liệu. Hãy kiểm tra SQL Server và DATABASE_URL rồi thử lại.'
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

exports.updateMyContact = async (req, res) => {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ success: false, message: 'Chức năng này chỉ dành cho sinh viên.' });
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
    if (req.user.role !== 'STUDENT') return res.status(403).json({ success: false, message: 'Chức năng này chỉ dành cho sinh viên.' });
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
