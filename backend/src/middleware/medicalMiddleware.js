const prisma = require("../config/prisma");
const ROLES = require("../config/roles");
const { restrictTo } = require("./rbacMiddleware");

// Dữ liệu hiện có có thể dùng medical_officer hoặc MEDICAL_OFFICER.
const isMedicalRole = (role) => typeof role === "string" && role.toUpperCase() === ROLES.MEDICAL_OFFICER;

const requireMedical = async (req, res, next) => {
    // protect resolves the employee identifier and current role from the account.
    const maNhanVien = req.user?.maNhanVien;
    if (typeof maNhanVien !== "string" || !maNhanVien.trim() || maNhanVien.length > 20
        || !isMedicalRole(req.user?.role)) {
        return res.status(403).json({
            success: false,
            message: "Chỉ nhân viên y tế mới được thực hiện chức năng này!"
        });
    }

    try {
        const nhanVien = await prisma.nhanVien.findUnique({
            where: { maNhanVien },
            select: { maNhanVien: true, userId: true }
        });
        // Kiểm tra lại CSDL để token cũ không giữ quyền sau khi bị thu hồi.
        if (!nhanVien || nhanVien.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền nhân viên y tế!"
            });
        }
        return next();
    } catch (error) {
        console.error("Lỗi phân quyền y tế:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi kiểm tra quyền truy cập!"
        });
    }
};

const managementRead = restrictTo(ROLES.BOARD_CHAIR, ROLES.BOARD_DEPUTY, ROLES.BUILDING_MANAGER);
const allowMedicalRead = (req, res, next) => isMedicalRole(req.user?.role)
    ? requireMedical(req, res, next)
    : managementRead(req, res, next);

module.exports = { requireMedical, allowMedicalRead };
