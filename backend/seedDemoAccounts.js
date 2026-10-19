require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const password = process.env.DEMO_ACCOUNTS_PASSWORD || 'Test@123456';

const employeeActors = [
    { username: 'actor.board_chair', role: 'BOARD_CHAIR', maNhanVien: 'NVTEST001', hoTen: 'Nguyễn Minh An', chucVu: 'Trưởng ban' },
    { username: 'actor.board_deputy', role: 'BOARD_DEPUTY', maNhanVien: 'NVTEST002', hoTen: 'Trần Thu Hà', chucVu: 'Phó trưởng ban' },
    { username: 'actor.archivist', role: 'ARCHIVIST', maNhanVien: 'NVTEST003', hoTen: 'Lê Quốc Bảo', chucVu: 'Hồ sơ lưu trữ' },
    { username: 'actor.accountant', role: 'ACCOUNTANT', maNhanVien: 'NVTEST004', hoTen: 'Phạm Ngọc Lan', chucVu: 'Kế toán' },
    { username: 'actor.treasurer', role: 'TREASURER', maNhanVien: 'NVTEST005', hoTen: 'Hoàng Đức Long', chucVu: 'Thủ quỹ' },
    { username: 'actor.facilities', role: 'FACILITIES_MANAGER', maNhanVien: 'NVTEST006', hoTen: 'Vũ Thành Nam', chucVu: 'Cơ sở vật chất' },
    { username: 'actor.building_manager', role: 'BUILDING_MANAGER', maNhanVien: 'NVTEST007', hoTen: 'Đặng Hải Yến', chucVu: 'Quản lý tòa nhà' },
    { username: 'actor.security', role: 'SECURITY', maNhanVien: 'NVTEST008', hoTen: 'Bùi Văn Hùng', chucVu: 'Trật tự - trị an' },
    { username: 'actor.military_officer', role: 'MILITARY_OFFICER', maNhanVien: 'NVTEST009', hoTen: 'Đỗ Quang Minh', chucVu: 'Quản lý quân sự' },
    { username: 'actor.medical_officer', role: 'MEDICAL_OFFICER', maNhanVien: 'NVTEST010', hoTen: 'Ngô Thu Trang', chucVu: 'Cán bộ y tế' },
    { username: 'actor.service_provider', role: 'SERVICE_PROVIDER', maNhanVien: 'NVTEST011', hoTen: 'Phan Hữu Thành', chucVu: 'Nhà cung cấp dịch vụ' }
];

const studentNames = [
    'Nguyễn Hoàng Anh', 'Trần Minh Khang', 'Lê Ngọc Mai', 'Phạm Gia Bảo', 'Hoàng Khánh Linh',
    'Vũ Đức Thịnh', 'Đặng Phương Thảo', 'Bùi Nhật Nam', 'Đỗ Thanh Vy', 'Ngô Quang Huy'
];

const suffix = (value) => String(value).padStart(3, '0');

const seedDemoAccounts = async () => {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
        throw new Error('Không chạy dữ liệu demo trên production nếu chưa đặt ALLOW_DEMO_SEED=true.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await prisma.$transaction(async (tx) => {
        const accounts = [];

        for (let index = 0; index < employeeActors.length; index += 1) {
            const actor = employeeActors[index];
            const account = await tx.user.upsert({
                where: { username: actor.username },
                update: { password: passwordHash, role: actor.role, isActive: true },
                create: { username: actor.username, password: passwordHash, role: actor.role, isActive: true }
            });
            await tx.nhanVien.upsert({
                where: { maNhanVien: actor.maNhanVien },
                update: {
                    userId: account.id, hoTen: actor.hoTen, ngaySinh: new Date('1985-01-15T00:00:00.000Z'),
                    gioiTinh: index % 2 === 0, queQuan: 'Hà Nội (dữ liệu thử)', danToc: 'Kinh',
                    cccd: `012600000${suffix(index + 1)}`, chucVu: actor.chucVu,
                    phone: `0900000${suffix(index + 1)}`, email: `${actor.username}@example.test`
                },
                create: {
                    maNhanVien: actor.maNhanVien, userId: account.id, hoTen: actor.hoTen,
                    ngaySinh: new Date('1985-01-15T00:00:00.000Z'), gioiTinh: index % 2 === 0,
                    queQuan: 'Hà Nội (dữ liệu thử)', danToc: 'Kinh', cccd: `012600000${suffix(index + 1)}`,
                    chucVu: actor.chucVu, phone: `0900000${suffix(index + 1)}`, email: `${actor.username}@example.test`
                }
            });
            accounts.push({ username: actor.username, role: actor.role });
        }

        const admin = await tx.user.upsert({
            where: { username: 'admin.test' },
            update: { password: passwordHash, role: 'ADMIN', isActive: true },
            create: { username: 'admin.test', password: passwordHash, role: 'ADMIN', isActive: true }
        });
        accounts.push({ username: admin.username, role: admin.role });

        for (let index = 0; index < studentNames.length; index += 1) {
            const studentCode = `SVTEST26${suffix(index + 1)}`;
            const account = await tx.user.upsert({
                where: { username: studentCode },
                update: { password: passwordHash, role: 'STUDENT', isActive: true },
                create: { username: studentCode, password: passwordHash, role: 'STUDENT', isActive: true }
            });
            await tx.sinhVien.upsert({
                where: { maSV: studentCode },
                update: {
                    userId: account.id, hoTen: studentNames[index],
                    ngaySinh: new Date(Date.UTC(2005, index % 12, (index % 26) + 1)),
                    gioiTinh: index % 2 === 0, lop: `CNTT${(index % 3) + 1}-K67`, nienKhoa: 'K67',
                    khoa: 'Công nghệ thông tin', cccd: `099000000${suffix(index + 1)}`,
                    phone: `0912000${suffix(index + 1)}`, email: `svtest${suffix(index + 1)}@example.test`, dienUuTien: null
                },
                create: {
                    maSV: studentCode, userId: account.id, hoTen: studentNames[index],
                    ngaySinh: new Date(Date.UTC(2005, index % 12, (index % 26) + 1)),
                    gioiTinh: index % 2 === 0, lop: `CNTT${(index % 3) + 1}-K67`, nienKhoa: 'K67',
                    khoa: 'Công nghệ thông tin', cccd: `099000000${suffix(index + 1)}`,
                    phone: `0912000${suffix(index + 1)}`, email: `svtest${suffix(index + 1)}@example.test`, dienUuTien: null
                }
            });
            accounts.push({ username: studentCode, role: account.role });
        }
        return accounts;
    }, { maxWait: 10000, timeout: 120000 });

    console.log(JSON.stringify({ count: result.length, sharedPassword: password, accounts: result }, null, 2));
};

seedDemoAccounts()
    .catch((error) => {
        console.error('Không thể tạo dữ liệu tài khoản demo:', error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
