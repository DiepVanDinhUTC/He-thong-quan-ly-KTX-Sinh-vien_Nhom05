const prismaClient = require('../config/prisma');
const ROLES = require('../config/roles');

const getPrisma = () => prismaClient;

exports.restrictTo = (...roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
    }
    const studentOnlyRoles = [ROLES.STUDENT, ROLES.MILITARY_STUDENT];
    const studentOnlyAction = roles.length > 0 && roles.every((role) => studentOnlyRoles.includes(role));
    if (req.user.role === ROLES.ADMIN && studentOnlyAction && !req.user.maSV) {
        return res.status(403).json({
            success: false,
            message: 'Để thử chức năng dành riêng cho sinh viên, hãy chọn một tài khoản sinh viên trong bộ chuyển chế độ kiểm thử của ADMIN.'
        });
    }
    if (req.user.role === ROLES.ADMIN) return next();
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Vai trò tài khoản không được phép thực hiện chức năng này.' });
    }
    return next();
};

/** Enforce a named permission against the current role loaded by JWT auth. */
exports.requirePermission = (permission) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
    }
    if (!ROLES.hasPermission(req.user.role, permission)) {
        return res.status(403).json({ success: false, message: 'Vai trò tài khoản không được phép thực hiện chức năng này.' });
    }
    return next();
};

const getRequestedBuildingIds = (req) => {
    const ids = [req.params.maToaNha, req.query.maToaNha, req.body?.maToaNha]
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => value.trim());
    return [...new Set(ids)];
};

/**
 * Resolve the user's current building assignments and reject cross-building access.
 * For collection endpoints, controllers should use req.buildingScope (null means global).
 */
const createRestrictBuildingAccess = ({ db = getPrisma } = {}) => async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
    }
    try {
        if (ROLES.GLOBAL_BUILDING_ROLES.has(req.user.role)) {
            req.buildingScope = null;
            return next();
        }

        const database = typeof db === 'function' ? db() : db;
        const assignments = await database.userBuildingAccess.findMany({
            where: { userId: req.user.id },
            select: { maToaNha: true }
        });
        const allowedIds = assignments.map(({ maToaNha }) => maToaNha);
        req.buildingScope = allowedIds;

        const requestedIds = getRequestedBuildingIds(req);
        const requestedRoomIds = [req.params.maPhong, req.body?.maPhong]
            .filter((value) => typeof value === 'string' && value.trim());
        for (const maPhong of new Set(requestedRoomIds)) {
            const room = await database.phong.findUnique({ where: { maPhong }, select: { maToaNha: true } });
            if (!room?.maToaNha) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy phòng thuộc tòa nhà.' });
            }
            requestedIds.push(room.maToaNha);
        }
        if (req.params.maHopDong || req.params.id) {
            const contractId = req.params.maHopDong || req.params.id;
            const contract = await database.hopDong.findUnique({
                where: { maHopDong: contractId },
                select: { phong: { select: { maToaNha: true } } }
            });
            if (contract?.phong?.maToaNha) requestedIds.push(contract.phong.maToaNha);
        }

        if (requestedIds.some((id) => !allowedIds.includes(id))) {
            return res.status(403).json({ success: false, message: 'Tài khoản không được cấp quyền với tòa nhà này.' });
        }
        if (requestedIds.length === 0 && allowedIds.length === 0) {
            return res.status(403).json({ success: false, message: 'Tài khoản chưa được phân công tòa nhà.' });
        }
        return next();
    } catch (error) {
        console.error(`[auth.buildingScope] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(503).json({ success: false, message: 'Không thể kiểm tra phạm vi tòa nhà lúc này.' });
    }
};

exports.createRestrictBuildingAccess = createRestrictBuildingAccess;
exports.restrictBuildingAccess = createRestrictBuildingAccess();

/** Limit student-record endpoints to residents whose current room is in an assigned building. */
const createRestrictStudentBuildingAccess = ({ db = getPrisma } = {}) => async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
    }
    try {
        if (ROLES.GLOBAL_BUILDING_ROLES.has(req.user.role)) {
            req.buildingScope = null;
            return next();
        }

        const database = typeof db === 'function' ? db() : db;
        if (req.user.role === ROLES.MEDICAL_OFFICER) {
            const buildings = await database.toaNha.findMany({ select: { maToaNha: true } });
            const allowedIds = buildings.map(({ maToaNha }) => maToaNha);
            req.buildingScope = allowedIds;

            const studentId = req.params.id || req.params.maSV;
            if (studentId) {
                const resident = await database.sinhVien.findFirst({
                    where: {
                        maSV: studentId,
                        hopDongs: {
                            some: {
                                trangThai: { in: ['ACTIVE', 'PENDING_PAYMENT'] },
                                phong: { is: { maToaNha: { in: allowedIds } } }
                            }
                        }
                    },
                    select: { maSV: true }
                });
                if (!resident) {
                    return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nội trú trong KTX.' });
                }
            }
            return next();
        }

        const assignments = await database.userBuildingAccess.findMany({
            where: { userId: req.user.id },
            select: { maToaNha: true }
        });
        const allowedIds = assignments.map(({ maToaNha }) => maToaNha);
        if (!allowedIds.length) {
            return res.status(403).json({ success: false, message: 'Tài khoản chưa được phân công tòa nhà.' });
        }
        req.buildingScope = allowedIds;

        const studentId = req.params.id || req.params.maSV;
        if (studentId) {
            const resident = await database.sinhVien.findFirst({
                where: {
                    maSV: studentId,
                    hopDongs: {
                        some: {
                            trangThai: { in: ['ACTIVE', 'PENDING_PAYMENT'] },
                            phong: { is: { maToaNha: { in: allowedIds } } }
                        }
                    }
                },
                select: { maSV: true }
            });
            if (!resident) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nội trú trong tòa nhà được phân công.' });
            }
        }
        return next();
    } catch (error) {
        console.error(`[auth.studentBuildingScope] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(503).json({ success: false, message: 'Không thể kiểm tra phạm vi hồ sơ nội trú lúc này.' });
    }
};

exports.createRestrictStudentBuildingAccess = createRestrictStudentBuildingAccess;
exports.restrictStudentBuildingAccess = createRestrictStudentBuildingAccess();
