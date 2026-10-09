const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handleBankTransfer = async (req, res) => {
    // 1. Xác thực nguồn gọi Webhook (Bảo mật)
    const apiKey = req.headers['x-api-key']; // Key do bạn cấu hình trên Casso/SePay
    if (apiKey !== process.env.WEBHOOK_SECRET) {
        return res.status(401).json({ success: false, message: 'Sai khóa bảo mật Webhook' });
    }

    // 2. Lấy dữ liệu từ payload (Ví dụ cấu trúc chuẩn của SePay/Casso)
    const { amount, description, transactionId } = req.body;

    try {
        // 3. Trích xuất Mã sinh viên từ nội dung CK (Ví dụ nội dung: "Ngan hang MB: KTX SV_002 P101")
        // Dùng Regex để tìm chuỗi có định dạng SV_xxx
        const svMatch = description.match(/SV_\d+/i); 
        
        if (!svMatch) {
            console.log(`Bỏ qua giao dịch ${transactionId}: Không tìm thấy mã sinh viên.`);
            return res.status(200).send('OK'); // Vẫn trả về 200 để Webhook không gửi lại
        }

        const maSinhVien = svMatch[0].toUpperCase();

        // 4. Tìm hợp đồng nháp khớp với mã SV và số tiền
        const contract = await prisma.hopDong.findFirst({
            where: {
                maSinhVien: maSinhVien,
                trangThai: 'PENDING_PAYMENT',
                tongTien: Number(amount) // Phải chuyển đúng số tiền
            }
        });

        if (!contract) {
            console.log(`Giao dịch ${transactionId}: Không tìm thấy hợp đồng hợp lệ cho ${maSinhVien}.`);
            return res.status(200).send('OK');
        }

        // 5. Thực thi Transaction (Tạo hóa đơn & Kích hoạt hợp đồng)
        await prisma.$transaction(async (tx) => {
            await tx.hoaDon.create({
                data: {
                    maHopDong: contract.maHopDong,
                    soTien: contract.tongTien,
                    phuongThuc: 'TRANSFER',
                    nguoiThu: 'SYSTEM_WEBHOOK', // Đánh dấu là hệ thống tự thu
                    // Có thể thêm trường maGiaoDich: transactionId vào DB nếu muốn đối soát
                }
            });

            await tx.hopDong.update({
                where: { maHopDong: contract.maHopDong },
                data: { trangThai: 'ACTIVE' }
            });
        });

        console.log(`✅ Tự động thanh toán thành công cho hợp đồng của ${maSinhVien}.`);
        res.status(200).json({ success: true, message: 'Đã xử lý Webhook thành công' });

    } catch (error) {
        console.error('Lỗi xử lý Webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};
