const prisma = require("../config/prisma");

// Tạo hồ sơ sức khỏe
exports.taoHoSo = async (req, res) => {
    try {
        const { maSinhVien, nhomMau, diUng, benhNen, ghiChu } = req.body;

        if (!maSinhVien) {
            return res.status(400).json({
                success: false,
                message: "Thiếu mã sinh viên"
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

        const hoSo = await prisma.hoSoSucKhoe.create({
            data: {
                maSinhVien,
                nhomMau,
                diUng,
                benhNen,
                ghiChu
            }
        });

        return res.status(201).json({
            success: true,
            message: "Tạo hồ sơ sức khỏe thành công",
            data: hoSo
        });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "Sinh viên đã có hồ sơ sức khỏe"
            });
        }

        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// Lấy hồ sơ sức khỏe
exports.layHoSo = async (req, res) => {
    try {
        const { maSV } = req.params;

        const hoSo = await prisma.hoSoSucKhoe.findUnique({
            where: { maSinhVien: maSV }
        });

        if (!hoSo) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy hồ sơ sức khỏe"
            });
        }

        return res.status(200).json({
            success: true,
            data: hoSo
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// Cập nhật hồ sơ
exports.capNhatHoSo = async (req, res) => {
    try {
        const { maSV } = req.params;
        const allowedFields = [
            "nhomMau", "diUng", "benhNen", "ghiChu"
        ];

        const data = {};

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                data[field] = req.body[field];
            }
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Không có thông tin cần cập nhật"
            });
        }

        const hoSo = await prisma.hoSoSucKhoe.update({
            where: { maSinhVien: maSV },
            data
        });

        return res.status(200).json({
            success: true,
            message: "Cập nhật hồ sơ thành công",
            data: hoSo
        });
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy hồ sơ"
            });
        }

        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// Thêm lịch sử khám
exports.themLichSuKham = async (req, res) => {
    try {
        const {
            maSinhVien,
            ngayKham,
            trieuChung,
            ketLuan,
            huongXuLy,
            ghiChu
        } = req.body;

        if (!maSinhVien || !trieuChung?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Thiếu mã sinh viên hoặc triệu chứng"
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

        const parsedDate = ngayKham
            ? new Date(ngayKham)
            : new Date();

        if (Number.isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Ngày khám không hợp lệ"
            });
        }

        const lichSu = await prisma.lichSuKham.create({
            data: {
                maSinhVien,
                ngayKham: parsedDate,
                trieuChung: trieuChung.trim(),
                ketLuan,
                huongXuLy,
                ghiChu
            }
        });

        return res.status(201).json({
            success: true,
            message: "Ghi nhận lịch sử khám thành công",
            data: lichSu
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// Xem lịch sử khám
exports.layLichSuKham = async (req, res) => {
    try {
        const { maSV } = req.params;

        const sinhVien = await prisma.sinhVien.findUnique({
            where: { maSV },
            select: { maSV: true }
        });

        if (!sinhVien) {
            return res.status(404).json({
                success: false,
                message: "Sinh viên không tồn tại"
            });
        }

        const danhSach = await prisma.lichSuKham.findMany({
            where: { maSinhVien: maSV },
            orderBy: { ngayKham: "desc" }
        });

        return res.status(200).json({
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
};
