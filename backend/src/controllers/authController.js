const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const studentProfileInclude = {
    hopDongs: {
        include: { phong: true },
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
        khoa: student?.khoa || null,
        email: student?.email || employee?.email || null,
        phone: student?.phone || employee?.phone || null,
        trangThaiNoiTru: student?.trangThaiNoiTru || null,
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
            trangThai: currentContract.trangThai
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
