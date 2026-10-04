const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createContract = async (req, res) => {
    const { maDangKy, maPhong, ngayBatDau, ngayKetThuc, tongTien } = req.body;

    try {
        // 1. Tiền kiểm (Validation)
        const dangKy = await prisma.dangKyKTX.findUnique({ where: { maDangKy } });
        const phong = await prisma.phong.findUnique({ where: { maPhong } });

        if (!dangKy || dangKy.trangThai !== 'PENDING') {
            return res.status(400).json({ 
                success: false, 
                message: 'Đơn đăng ký không tồn tại hoặc đã được xử lý.' 
            });
        }

        if (!phong) {
            return res.status(404).json({ success: false, message: 'Phòng không tồn tại.' });
        }

        if (phong.soSinhVienHienTai >= phong.soSinhVienToiDa) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phòng đã đạt sức chứa tối đa, không thể giữ chỗ.' 
            });
        }

        // 2. Thực thi Transaction nguyên tử
        const result = await prisma.$transaction([
            // Bước 2.1: Tạo Hợp đồng nháp
            prisma.hopDong.create({
                data: {
                    maSinhVien: dangKy.maSinhVien,
                    maPhong: maPhong,
                    ngayBatDau: new Date(ngayBatDau),
                    ngayKetThuc: new Date(ngayKetThuc),
                    tongTien: parseFloat(tongTien),
                    trangThai: 'PENDING_PAYMENT'
                }
            }),

            // Bước 2.2: Cập nhật trạng thái Đơn đăng ký thành Đã duyệt
            prisma.dangKyKTX.update({
                where: { maDangKy },
                data: { trangThai: 'APPROVED' }
            }),

            // Bước 2.3: Giữ chỗ bằng cách tăng số người hiện tại trong phòng lên 1
            prisma.phong.update({
                where: { maPhong },
                data: { soSinhVienHienTai: { increment: 1 } }
            })
        ]);

        res.status(201).json({ 
            success: true, 
            data: result[0],
            message: 'Tạo hợp đồng nháp và giữ chỗ phòng thành công.' 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi hệ thống khi tạo hợp đồng.', 
            error: error.message 
        });
    }
};