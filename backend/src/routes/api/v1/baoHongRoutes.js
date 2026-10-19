const express = require("express");
const { PrismaClient } = require("@prisma/client");
const upload = require("../../../middleware/upload");
const cloudinary = require("../../../config/cloudinary");
const { protect } = require("../../../middleware/authMiddleware");
const { restrictTo } = require("../../../middleware/rbacMiddleware");
const ROLES = require("../../../config/roles");

const router = express.Router();
const prisma = new PrismaClient();

const handleImageUpload = (req, res, next) => {
    upload.single("anhHienTrang")(req, res, (error) => {
        if (!error) return next();

        const isSizeError = error.code === "LIMIT_FILE_SIZE";

        return res.status(400).json({
            success: false,
            message: isSizeError
                ? "Ảnh hiện trạng không được vượt quá 5MB"
                : error.message
        });
    });
};

const hasCloudinaryConfig = () => (
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET
);

// POST /api/v1/bao-hong
router.post(
    "/",
    protect,
    restrictTo(ROLES.STUDENT, ROLES.MANAGER, ROLES.DIRECTOR),
    handleImageUpload,
    async (req, res) => {
        let uploadedImagePublicId = null;

        try {
            const { maThietBi, moTa } = req.body;
            const maSinhVien = req.user.role === ROLES.STUDENT
                ? req.user.id
                : req.body.maSinhVien;

            if (!maSinhVien || !maThietBi || !moTa?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Vui lòng nhập đầy đủ thông tin báo hỏng"
                });
            }

            const sinhVien = await prisma.sinhVien.findUnique({
                where: { maSV: maSinhVien }
            });

            if (!sinhVien) {
                return res.status(404).json({
                    success: false,
                    message: "Sinh viên không tồn tại"
                });
            }

            const thietBi = await prisma.thietBi.findUnique({
                where: { maThietBi }
            });

            if (!thietBi) {
                return res.status(404).json({
                    success: false,
                    message: "Thiết bị không tồn tại"
                });
            }

            let anhHienTrang = null;
            let anhHienTrangPublicId = null;

            if (req.file) {
                if (!hasCloudinaryConfig()) {
                    return res.status(500).json({
                        success: false,
                        message: "Thiếu cấu hình Cloudinary để tải ảnh hiện trạng"
                    });
                }

                const base64 = req.file.buffer.toString("base64");
                const dataURI =
                    `data:${req.file.mimetype};base64,${base64}`;

                const result = await cloudinary.uploader.upload(dataURI, {
                    folder: "ktx/bao-hong",
                    resource_type: "image"
                });

                anhHienTrang = result.secure_url;
                anhHienTrangPublicId = result.public_id;
                uploadedImagePublicId = result.public_id;
            }

            const ticket = await prisma.baoHong.create({
                data: {
                    maSinhVien,
                    maThietBi,
                    moTa: moTa.trim(),
                    anhHienTrang,
                    anhHienTrangPublicId,
                    trangThai: "PENDING"
                }
            });

            return res.status(201).json({
                success: true,
                message: "Gửi báo hỏng thành công",
                data: ticket
            });
        } catch (error) {
            console.error("Lỗi báo hỏng:", error);

            if (uploadedImagePublicId) {
                try {
                    await cloudinary.uploader.destroy(uploadedImagePublicId);
                } catch (cleanupError) {
                    console.error("Lỗi xóa ảnh báo hỏng sau khi tạo ticket thất bại:", cleanupError);
                }
            }

            return res.status(500).json({
                success: false,
                message: "Không thể tạo ticket báo hỏng"
            });
        }
    }
);

module.exports = router;
