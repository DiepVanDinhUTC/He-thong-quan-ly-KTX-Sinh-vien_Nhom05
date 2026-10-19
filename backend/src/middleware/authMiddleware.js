const jwt = require('jsonwebtoken');
const prismaClient = require('../config/prisma');
const { KNOWN_ROLES } = require('../config/roles');

const getPrisma = () => prismaClient;
const canUseAdminRoleTesting = () => (
    String(process.env.NODE_ENV || '').toLowerCase() !== 'production'
    || process.env.ALLOW_ADMIN_ROLE_TESTING === 'true'
);

/** Create a JWT guard; dependencies can be replaced in tests without a live database. */
const createProtect = ({ db = getPrisma, jwtClient = jwt, getSecret = () => process.env.JWT_SECRET } = {}) => async (req, res, next) => {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+([^\s]+)$/i);

    if (!match) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
    }
    const secret = getSecret();
    if (!secret) {
        console.error('[auth.protect] JWT_SECRET is not configured');
        return res.status(500).json({ success: false, message: 'Máy chủ chưa cấu hình xác thực.' });
    }

    let decoded;
    try {
        decoded = jwtClient.verify(match[1], secret, { algorithms: ['HS256'] });
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }

    if (!decoded || typeof decoded.id !== 'string' || !decoded.id) {
        return res.status(401).json({ success: false, message: 'Token không hợp lệ.' });
    }

    try {
        const database = typeof db === 'function' ? db() : db;
        const account = await database.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                role: true,
                isActive: true,
                nhanVien: { select: { maNhanVien: true } },
                sinhVien: { select: { maSV: true } }
            }
        });

        if (!account || !account.isActive) {
            return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị khóa.' });
        }
        if (!KNOWN_ROLES.has(account.role)) {
            return res.status(403).json({ success: false, message: 'Tài khoản chưa được gán vai trò hợp lệ.' });
        }

        let effectiveAccount = account;
        const testAccountUsername = (req.get('x-admin-test-account') || '').trim();
        if (testAccountUsername) {
            if (account.role !== 'ADMIN') {
                return res.status(403).json({ success: false, message: 'Chỉ tài khoản ADMIN mới được dùng chế độ kiểm thử vai trò.' });
            }
            if (!canUseAdminRoleTesting()) {
                return res.status(403).json({ success: false, message: 'Chế độ kiểm thử vai trò đang bị tắt trên production.' });
            }
            if (testAccountUsername.length > 50) {
                return res.status(400).json({ success: false, message: 'Tài khoản kiểm thử không hợp lệ.' });
            }

            const targetAccount = await database.user.findUnique({
                where: { username: testAccountUsername },
                select: {
                    id: true,
                    username: true,
                    role: true,
                    isActive: true,
                    nhanVien: { select: { maNhanVien: true } },
                    sinhVien: { select: { maSV: true } }
                }
            });
            if (!targetAccount || !targetAccount.isActive || !KNOWN_ROLES.has(targetAccount.role) || targetAccount.role === 'ADMIN') {
                return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản kiểm thử đang hoạt động.' });
            }
            const studentRole = ['STUDENT', 'MILITARY_STUDENT'].includes(targetAccount.role);
            if ((studentRole && !targetAccount.sinhVien) || (!studentRole && !targetAccount.nhanVien)) {
                return res.status(400).json({ success: false, message: 'Tài khoản kiểm thử chưa liên kết hồ sơ tương ứng.' });
            }
            effectiveAccount = targetAccount;
            req.adminTestMode = { adminUserId: account.id, targetUsername: targetAccount.username };
        }

        // The database is the source of truth; role changes and account lockouts take effect immediately.
        req.authUser = { id: account.id, role: account.role };
        req.user = {
            id: effectiveAccount.id,
            role: effectiveAccount.role,
            maNhanVien: effectiveAccount.nhanVien?.maNhanVien || null,
            maSV: effectiveAccount.sinhVien?.maSV || null
        };
        return next();
    } catch (error) {
        console.error(`[auth.protect] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(503).json({ success: false, message: 'Không thể xác thực tài khoản lúc này.' });
    }
};

exports.createProtect = createProtect;
exports.protect = createProtect();
