const express = require('express');
const router = express.Router();

// 50 hồ sơ sinh viên giả lập, dùng dữ liệu hư cấu để thử tích hợp SIS.
const hoDemNam = ['Nguyễn Văn', 'Trần Minh', 'Lê Quang', 'Phạm Đức', 'Hoàng Gia', 'Vũ Anh', 'Đặng Hữu', 'Bùi Xuân', 'Đỗ Thành', 'Ngô Nhật'];
const hoDemNu = ['Nguyễn Thị', 'Trần Thu', 'Lê Ngọc', 'Phạm Khánh', 'Hoàng Mai', 'Vũ Phương', 'Đặng Thanh', 'Bùi Hà', 'Đỗ Minh', 'Ngô Bảo'];
const tenNam = ['An', 'Bảo', 'Cường', 'Dũng', 'Đạt', 'Hải', 'Hiếu', 'Hưng', 'Khang', 'Long', 'Minh', 'Nam', 'Phong', 'Quân', 'Sơn'];
const tenNu = ['Anh', 'Chi', 'Dung', 'Giang', 'Hà', 'Hạnh', 'Lan', 'Linh', 'Mai', 'My', 'Ngọc', 'Phương', 'Trang', 'Thảo', 'Vy'];
const majors = [
    { maKhoa: 'KHOA-CNTT', lop: 'CNTT', khoa: 'Công nghệ thông tin' },
    { maKhoa: 'KHOA-CT', lop: 'KTXD', khoa: 'Công trình' },
    { maKhoa: 'KHOA-VTK', lop: 'KTVT', khoa: 'Vận tải - Kinh tế' },
    { maKhoa: 'KHOA-DT', lop: 'KTDK', khoa: 'Điện - Điện tử' },
    { maKhoa: 'KHOA-CK', lop: 'KCK', khoa: 'Cơ khí' }
];
const priorities = ['Không', 'Không', 'Không', 'Con thương binh', 'Hộ nghèo'];

const mockStudents = Array.from({ length: 50 }, (_, index) => {
    const number = index + 1;
    const female = number % 2 === 0;
    const familyNames = female ? hoDemNu : hoDemNam;
    const givenNames = female ? tenNu : tenNam;
    const major = majors[index % majors.length];
    const fullName = `${familyNames[(number * 3) % familyNames.length]} ${givenNames[(number * 7) % givenNames.length]}`;
    const studentCode = `SIS24${String(number).padStart(5, '0')}`;
    const phone = `09${String(10000000 + number * 7919).slice(-8)}`;

    return {
        maSV: studentCode,
        hoTen: fullName,
        ngaySinh: new Date(Date.UTC(2003 + (index % 3), index % 12, (index % 27) + 1)).toISOString(),
        gioiTinh: !female,
        lop: `${major.lop}${(index % 4) + 1}-K${64 + (index % 3)}`,
        nienKhoa: `K${64 + (index % 3)}`,
        maKhoa: major.maKhoa,
        khoa: major.khoa,
        cccd: `099${String(200300000 + number).padStart(9, '0')}`,
        phone,
        email: `sv${String(number).padStart(2, '0')}@example.test`,
        dienUuTien: priorities[index % priorities.length],
    };
});

const batches = ['DOT-1', 'DOT-2'];
const registrationStatuses = ['REGISTERED', 'CONFIRMED', 'ENROLLED', 'APPROVED'];
const mockRegistrations = mockStudents.map((student, index) => ({
    courseCode: 'GDQP101',
    facultyCode: student.maKhoa,
    batchCode: batches[index % batches.length],
    registrationStatus: registrationStatuses[index % registrationStatuses.length],
    student
}));

for (const student of mockStudents) {
    student.courseRegistrations = mockRegistrations
        .filter((registration) => registration.student.maSV === student.maSV)
        .map(({ courseCode, facultyCode, batchCode, registrationStatus }) => ({
            courseCode,
            facultyCode,
            batchCode,
            registrationStatus
        }));
}

router.get('/students', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Đã lấy 50 hồ sơ sinh viên mẫu và 50 đăng ký GDQP hợp lệ từ API SIS Phòng Đào tạo.',
        meta: { totalStudents: mockStudents.length, eligibleGdqpRegistrations: mockRegistrations.length },
        data: mockStudents
    });
});

const gdqpStudents = [
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

// SIS chỉ trả các đăng ký GDQP còn hiệu lực của đúng đợt được yêu cầu.
const mockDangKyGDQP = {
    'GDQP-2026-01': ['20120001', '20120002'],
    'GDQP-2026-02': ['20120001', '20120002']
};

router.get('/gdqp/registrations', (req, res) => {
    const { maDot, khoa } = req.query;
    if (typeof maDot !== 'string' || !maDot.trim() ||
        (khoa !== undefined && typeof khoa !== 'string')) {
        return res.status(400).json({ success: false, message: 'Cần mã đợt và danh sách khoa hợp lệ' });
    }
    const dot = maDot.trim();
    if (!Object.hasOwn(mockDangKyGDQP, dot)) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đợt GDQP' });
    }
    const danhSachKhoa = khoa?.split(',').map(item => item.trim());
    const hocViens = gdqpStudents.filter(sv =>
        mockDangKyGDQP[dot].includes(sv.maSV) && (!danhSachKhoa || danhSachKhoa.includes(sv.khoa))
    );
    return res.json({ success: true, data: { maDot: dot, hocViens } });
});

module.exports = router;
