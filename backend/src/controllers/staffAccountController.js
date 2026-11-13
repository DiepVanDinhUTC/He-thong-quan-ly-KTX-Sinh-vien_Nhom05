const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

const MANAGED_ROLES = [
    'ARCHIVIST',
    'ACCOUNTANT',
    'TREASURER',
    'FACILITIES_MANAGER',
    'BUILDING_MANAGER',
    'SECURITY',
    'MILITARY_OFFICER',
    'MEDICAL_OFFICER',
    'SERVICE_PROVIDER'
];

const employeeSelect = {
    maNhanVien: true,
    hoTen: true,
    ngaySinh: true,
    gioiTinh: true,
    queQuan: true,
    danToc: true,
    cccd: true,
    chucVu: true,
    phone: true,
    email: true
};

const presentAccount = (account) => ({
    username: account.username,
    role: account.role,
    isActive: account.isActive,
    createdAt: account.createdAt,
    employee: account.nhanVien,
    buildingIds: (account.buildingAccess || []).map((item) => item.maToaNha)
});

const employeeAccountWhere = (maNhanVien) => ({
    role: { in: MANAGED_ROLES },
    nhanVien: { is: { maNhanVien } }
});

const stringLimits = {
    username: 50,
    hoTen: 100,
    chucVu: 100,
    email: 100,
    phone: 15,
    cccd: 20,
    queQuan: 255,
    danToc: 50
};

const validateProfile = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Dữ liệu cập nhật không hợp lệ.';

    for (const [field, maxLength] of Object.entries(stringLimits)) {
        if (body[field] === undefined) continue;
        if (typeof body[field] !== 'string') return `Trường ${field} phải là chuỗi.`;
        const value = body[field].trim();
        if (!value || value.length > maxLength) return `Trường ${field} không được để trống và tối đa ${maxLength} ký tự.`;
        body[field] = value;
    }

    if (body.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        return 'Địa chỉ email không hợp lệ.';
    }
    if (body.phone !== undefined && !/^\+?[0-9\s().-]{9,15}$/.test(body.phone)) {
        return 'Số điện thoại không hợp lệ.';
    }
    if (body.ngaySinh !== undefined) {
        const date = new Date(body.ngaySinh);
        if (typeof body.ngaySinh !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.ngaySinh) || Number.isNaN(date.getTime()) || date > new Date()) {
            return 'Ngày sinh không hợp lệ.';
        }
        body.ngaySinh = date;
    }
    if (body.gioiTinh !== undefined && typeof body.gioiTinh !== 'boolean') {
        return 'Giới tính không hợp lệ.';
    }

    const allowedFields = new Set([...Object.keys(stringLimits), 'ngaySinh', 'gioiTinh']);
    if (!Object.keys(body).some((field) => allowedFields.has(field))) return 'Không có thông tin nào để cập nhật.';
    if (Object.keys(body).some((field) => !allowedFields.has(field))) return 'Có trường thông tin không được hỗ trợ.';
    return null;
};

exports.listStaffAccounts = async (req, res) => {
    try {
        const accounts = await prisma.user.findMany({
            where: {
                role: { in: MANAGED_ROLES },
                nhanVien: { isNot: null }
            },
            select: {
                username: true,
                role: true,
                isActive: true,
                createdAt: true,
                buildingAccess: { select: { maToaNha: true } },
                nhanVien: { select: employeeSelect }
            },
            orderBy: [{ role: 'asc' }, { username: 'asc' }]
        });
        return res.status(200).json({ success: true, data: accounts.map(presentAccount) });
    } catch (error) {
        console.error(`[staffAccounts.list] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách tài khoản nhân viên.' });
    }
};

exports.updateStaffAccount = async (req, res) => {
    const validationError = validateProfile(req.body);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const { maNhanVien } = req.params;
    const profileData = Object.fromEntries(
        Object.entries(req.body).filter(([field]) => field !== 'username')
    );
    const userData = req.body.username === undefined ? null : { username: req.body.username };

    try {
        const account = await prisma.user.findFirst({
            where: employeeAccountWhere(maNhanVien),
            select: { id: true, username: true }
        });
        if (!account) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản nhân viên có thể quản lý.' });

        if (userData) {
            const existingUsername = await prisma.user.findUnique({ where: { username: userData.username }, select: { id: true } });
            if (existingUsername && existingUsername.id !== account.id) {
                return res.status(409).json({ success: false, message: 'Tên đăng nhập đã được sử dụng.' });
            }
        }

        const updatedAccount = await prisma.$transaction(async (tx) => {
            if (userData) await tx.user.update({ where: { id: account.id }, data: userData });
            await tx.nhanVien.update({ where: { maNhanVien }, data: profileData });
            return tx.user.findUnique({
                where: { id: account.id },
                select: {
                    username: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    buildingAccess: { select: { maToaNha: true } },
                    nhanVien: { select: employeeSelect }
                }
            });
        });
        return res.status(200).json({ success: true, message: 'Đã cập nhật thông tin tài khoản nhân viên.', data: presentAccount(updatedAccount) });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Tên đăng nhập hoặc CCCD đã được sử dụng.' });
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản nhân viên.' });
        console.error(`[staffAccounts.update] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật thông tin tài khoản nhân viên.' });
    }
};

exports.changeStaffPassword = async (req, res) => {
    const { newPassword } = req.body || {};
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
        return res.status(400).json({ success: false, message: 'Mật khẩu mới cần có từ 8 đến 128 ký tự.' });
    }

    try {
        const account = await prisma.user.findFirst({
            where: employeeAccountWhere(req.params.maNhanVien),
            select: { id: true }
        });
        if (!account) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản nhân viên có thể quản lý.' });

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await prisma.$transaction(async (tx) => {
            await tx.user.update({ where: { id: account.id }, data: { password: passwordHash } });
            await tx.passwordResetToken.deleteMany({ where: { userId: account.id } });
        });
        return res.status(200).json({ success: true, message: 'Đã đổi mật khẩu tài khoản nhân viên.' });
    } catch (error) {
        console.error(`[staffAccounts.password] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể đổi mật khẩu tài khoản nhân viên.' });
    }
};


const SCOPED_ROLES = ['FACILITIES_MANAGER', 'BUILDING_MANAGER', 'SECURITY'];

exports.listAccessBuildings = async (req, res) => {
    try {
        const buildings = await prisma.toaNha.findMany({
            select: { maToaNha: true, tenToaNha: true, maKhu: true },
            orderBy: [{ maKhu: 'asc' }, { tenToaNha: 'asc' }]
        });
        return res.json({ success: true, data: buildings });
    } catch (error) {
        console.error(`[staffAccounts.buildings] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách tòa nhà.' });
    }
};

exports.updateBuildingAccess = async (req, res) => {
    const ids = req.body?.buildingIds;
    if (!req.body || Object.keys(req.body).length !== 1 || !Array.isArray(ids)
        || ids.some((id) => typeof id !== 'string' || !id.trim() || id !== id.trim() || id.length > 20)
        || new Set(ids).size !== ids.length) {
        return res.status(400).json({ success: false, message: 'Danh sách mã tòa nhà không hợp lệ.' });
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            const account = await tx.user.findFirst({
                where: { role: { in: SCOPED_ROLES }, nhanVien: { is: { maNhanVien: req.params.maNhanVien } } },
                select: { id: true }
            });
            if (!account) return 'not_found';
            const buildings = await tx.toaNha.findMany({ where: { maToaNha: { in: ids } }, select: { maToaNha: true } });
            if (buildings.length !== ids.length) return 'invalid_building';
            await tx.userBuildingAccess.deleteMany({ where: ids.length ? { userId: account.id, maToaNha: { notIn: ids } } : { userId: account.id } });
            for (const maToaNha of ids) {
                await tx.userBuildingAccess.upsert({
                    where: { userId_maToaNha: { userId: account.id, maToaNha } },
                    create: { userId: account.id, maToaNha }, update: {}
                });
            }
            return 'ok';
        });
        if (result === 'not_found') return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên có phạm vi theo tòa.' });
        if (result === 'invalid_building') return res.status(400).json({ success: false, message: 'Có tòa nhà không tồn tại.' });
        return res.json({ success: true, message: 'Đã cập nhật phạm vi tòa nhà.', data: { buildingIds: ids } });
    } catch (error) {
        console.error(`[staffAccounts.access] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật phạm vi tòa nhà.' });
    }
};
