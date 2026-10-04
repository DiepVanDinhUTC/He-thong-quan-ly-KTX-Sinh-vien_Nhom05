const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.syncStudentsFromSis = async () => {
    try {
        // 1. Gọi API đến hệ thống sis.utc (hiện tại đang là mock url)
        const response = await axios.get(process.env.SIS_UTC_API_URL);
        const studentsData = response.data.data;

        let syncedCount = 0;

        // 2. Lặp qua danh sách sinh viên và lưu/cập nhật vào CSDL
        for (const student of studentsData) {
            // Dùng hàm upsert: Có thì cập nhật, chưa có thì tạo mới
            await prisma.sinhVien.upsert({
                where: { maSV: student.maSV },
                update: {
                    hoTen: student.hoTen,
                    lop: student.lop,
                    khoa: student.khoa,
                    // Cập nhật các trường khác nếu cần
                },
                create: {
                    maSV: student.maSV,
                    hoTen: student.hoTen,
                    ngaySinh: student.ngaySinh,
                    gioiTinh: student.gioiTinh,
                    lop: student.lop,
                    khoa: student.khoa,
                    cccd: student.cccd,
                    phone: student.phone,
                    email: student.email,
                    dienUuTien: student.dienUuTien,
                    trangThaiNoiTru: student.trangThaiNoiTru
                }
            });
            syncedCount++;
        }

        return { success: true, count: syncedCount };
    } catch (error) {
        console.error('Lỗi đồng bộ:', error.message);
        throw new Error('Không thể kết nối đến hệ thống Phòng Đào tạo');
    }
};