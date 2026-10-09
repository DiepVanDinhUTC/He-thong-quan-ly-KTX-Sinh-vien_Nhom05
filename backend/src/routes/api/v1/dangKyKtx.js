const express = require('express');
const {PrismaClient} = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

//POST /api/v1/dangKyKtx
router.post("/", async (req, res) => {
    try {
        const { maSinhVien, loaiPhongYeuCau } = req.body;
    //kiểm tra dữ liệu đầu vào
    if(!maSinhVien || !loaiPhongYeuCau) {
        return res.status(400).json({ 
            success: false,
            message: "Vui lòng cung cấp mã sinh viên và loại phòng" });
    }
    //kiểm tra loại phòng
    if(!["quạt", "điều hòa"].includes(loaiPhongYeuCau)){
        return res.status(400).json({
            success: false,
            message: "Loại phòng yêu cầu không hợp lệ. Vui lòng chọn 'quạt' hoặc 'điều hòa'."
        });
    }
    //kiểm tra sinh viên có tồn tại không
    const sinhVien = await prisma.sinhVien.findUnique({
        where: { maSV: maSinhVien }
    });
    if(!sinhVien){
        return res.status(404).json({
            success: false,
            message: "Sinh viên không tồn tại."
        });
    }
    //kiểm tra sinh viên có đơn đăng ký đang chờ xử lý không
    const donDangKy = await prisma.dangKyKTX.findFirst({
            where: {
                maSinhVien: maSinhVien,
                trangThai: "PENDING"
            }
        });

        if (donDangKy) {
            return res.status(409).json({
                success: false,
                message: "Sinh viên đã có đơn đăng ký đang chờ xử lý"
            });
        }
    //tạo đơn đăng ký mới
    const dangKy = await prisma.dangKyKTX.create({
            data: {
                maSinhVien: maSinhVien,
                loaiPhongYeuCau: loaiPhongYeuCau
            },
            include: {
                sinhVien: true
            }
        });

        return res.status(201).json({
            success: true,
            message: "Đăng ký nội trú thành công",
            data: dangKy
        });

    } 
    catch (error) {
        console.error("Lỗi đăng ký KTX:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
});

//GET /api/v1/dangKyKtx/:maSinhVien
router.get("/:maSinhVien", async (req, res) => {
    try {
        const { maSinhVien } = req.params;
        const danhSach = await prisma.dangKyKTX.findMany({
            where: {
                maSinhVien: maSinhVien
            },
            orderBy: {
                ngayDangKy: "desc"
            }
        });

        return res.json({
            success: true,
            data: danhSach
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
});

module.exports = router;
