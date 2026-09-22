const express = require('express');
const router = express.Router();

// Route này đóng vai trò như server của Phòng Đào tạo
router.get('/students', (req, res) => {
    // Trả về danh sách sinh viên giả định với cấu trúc giống thật
    const mockStudents = [
        {
            maSV: '20120001',
            hoTen: 'Nguyễn Văn A',
            ngaySinh: '2002-05-15T00:00:00Z',
            gioiTinh: true, // true: Nam
            lop: 'CNTT1-K61',
            khoa: 'Công nghệ thông tin',
            cccd: '001202000123',
            phone: '0987654321',
            email: 'nva.61@st.utc.edu.vn',
            dienUuTien: 'Không',
            trangThaiNoiTru: 'Chưa đăng ký'
        },
        {
            maSV: '20120002',
            hoTen: 'Trần Thị B',
            ngaySinh: '2002-10-20T00:00:00Z',
            gioiTinh: false, // false: Nữ
            lop: 'KKT1-K61',
            khoa: 'Kinh tế',
            cccd: '001202000124',
            phone: '0912345678',
            email: 'ttb.61@st.utc.edu.vn',
            dienUuTien: 'Con thương binh',
            trangThaiNoiTru: 'Chưa đăng ký'
        }
    ];

    res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu từ sis.utc thành công',
        data: mockStudents
    });
});

module.exports = router;