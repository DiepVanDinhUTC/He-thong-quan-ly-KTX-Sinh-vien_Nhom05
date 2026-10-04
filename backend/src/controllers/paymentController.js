const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.generateQR = async (req, res) => {
    const { maHopDong } = req.params;

    try {
        // 1. Lấy thông tin hợp đồng và sinh viên
        const contract = await prisma.hopDong.findUnique({
            where: { maHopDong },
            include: { sinhVien: true } // Lấy kèm thông tin sinh viên
        });

        if (!contract || contract.trangThai !== 'PENDING_PAYMENT') {
            return res.status(400).json({ success: false, message: 'Hợp đồng không hợp lệ để thanh toán.' });
        }

        // 2. Tạo nội dung chuyển khoản chuẩn hóa (Không dấu, không ký tự đặc biệt)
        // Ví dụ: KTX SV_002 P101
        const transferContent = `KTX ${contract.maSinhVien} ${contract.maPhong}`.replace(/[^a-zA-Z0-9 ]/g, "");

        // 3. Gọi API của VietQR để sinh ảnh
        const vietQrPayload = {
            accountNo: process.env.BANK_ACCOUNT_NO,
            accountName: process.env.BANK_ACCOUNT_NAME,
            acqId: process.env.BANK_ID,
            amount: contract.tongTien,
            addInfo: transferContent,
            format: "text",
            template: "compact" // Dạng thu gọn
        };

        const qrResponse = await axios.post('https://api.vietqr.io/v2/generate', vietQrPayload);

        if (qrResponse.data.code !== '00') {
            throw new Error('Lỗi từ hệ thống VietQR');
        }

        // 4. Trả về Data URL (Ảnh base64) cho Frontend hiển thị
        res.status(200).json({
            success: true,
            data: {
                maHopDong: contract.maHopDong,
                tongTien: contract.tongTien,
                noiDungCK: transferContent,
                qrCodeImage: qrResponse.data.data.qrDataURL // Ảnh mã QR để render thẻ <img>
            }
        });

    } catch (error) {
        console.error('Lỗi sinh QR Code:', error.message);
        res.status(500).json({ success: false, message: 'Không thể tạo mã thanh toán lúc này.' });
    }
};
exports.processPayment = async (req, res) => {
    const { maHopDong } = req.params;
    const { phuongThuc } = req.body;
    const nguoiThu = req.user.username; // Lấy từ Token phân quyền của Kế toán

    try {
        // 1. Kiểm tra hợp đồng có hợp lệ để thanh toán không
        const contract = await prisma.hopDong.findUnique({
            where: { maHopDong }
        });

        if (!contract || contract.trangThai !== 'PENDING_PAYMENT') {
            return res.status(400).json({
                success: false,
                message: 'Hợp đồng không tồn tại hoặc đã hết hạn thanh toán.'
            });
        }

        // 2. Thực thi Transaction đồng bộ dữ liệu
        const result = await prisma.$transaction(async (tx) => {
            // A. Ghi nhận Hóa đơn
            const invoice = await tx.hoaDon.create({
                data: {
                    maHopDong,
                    soTien: contract.tongTien,
                    phuongThuc: phuongThuc || 'TRANSFER',
                    nguoiThu
                }
            });

            // B. Kích hoạt Hợp đồng
            const updatedContract = await tx.hopDong.update({
                where: { maHopDong },
                data: { trangThai: 'ACTIVE' }
            });

            // C. Cập nhật trạng thái cư trú của Sinh viên
            await tx.sinhVien.update({
                where: { maSV: contract.maSinhVien },
                data: { trangThaiNoiTru: 'Đang lưu trú' }
            });

            return { invoice, updatedContract };
        });

        res.status(200).json({
            success: true,
            message: 'Thanh toán thành công. Hợp đồng đã có hiệu lực.',
            data: result
        });

    } catch (error) {
        console.error('Lỗi giao dịch thanh toán:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xử lý thanh toán.' });
    }
};