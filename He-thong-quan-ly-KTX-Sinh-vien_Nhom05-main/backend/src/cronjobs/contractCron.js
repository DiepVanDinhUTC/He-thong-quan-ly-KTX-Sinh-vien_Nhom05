const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🚀 File contractCron.js đã được nạp vào hệ thống!');

// Thiết lập chạy vào lúc 00:00 (nửa đêm) mỗi ngày
cron.schedule('0 0 * * *', async () => { //0 0 * * * , */5 * * * * *
    console.log('⏳ Đang chạy Cronjob: Quét hợp đồng quá hạn...');

    try {
        // Mốc thời hạn: Hủy nếu hợp đồng nháp đã tạo quá 48 giờ
        const expirationTime = new Date(Date.now() - 48 * 60 * 60 * 1000); //48 * 60 * 60 * 1000, 1 * 60 * 1000

        // 1. Tìm tất cả hợp đồng PENDING_PAYMENT quá hạn
        const expiredContracts = await prisma.hopDong.findMany({
            where: {
                trangThai: 'PENDING_PAYMENT',
                ngayTao: {
                    lt: expirationTime // lt: less than (nhỏ hơn/cũ hơn mốc 48h)
                }
            }
        });

        if (expiredContracts.length === 0) {
            console.log('✅ Không có hợp đồng nào quá hạn hôm nay.');
            return;
        }

        console.log(`⚠️ Phát hiện ${expiredContracts.length} hợp đồng quá hạn. Bắt đầu xử lý...`);

        // 2. Dùng Transaction để Hủy hợp đồng và Nhả phòng đồng loạt
        for (const contract of expiredContracts) {
            await prisma.$transaction([
                // Đổi trạng thái hợp đồng thành CANCELLED
                prisma.hopDong.update({
                    where: { maHopDong: contract.maHopDong },
                    data: { trangThai: 'CANCELLED' }
                }),
                
                // Trừ số lượng người hiện tại của phòng đi 1 (giải phóng slot)
                prisma.phong.update({
                    where: { maPhong: contract.maPhong },
                    data: { soSinhVienHienTai: { decrement: 1 } }
                })
            ]);
        }

        console.log('✅ Đã dọn dẹp xong các hợp đồng quá hạn và giải phóng phòng.');

    } catch (error) {
        console.error('❌ Lỗi khi chạy Cronjob Hủy hợp đồng:', error.message);
    }
});