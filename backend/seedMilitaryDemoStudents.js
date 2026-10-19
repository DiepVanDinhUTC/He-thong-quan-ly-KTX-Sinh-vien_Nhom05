require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { assignMilitaryStudentsToA1 } = require('./src/services/militaryRoomAssignmentService');

const prisma = new PrismaClient();
const password = process.env.MILITARY_DEMO_PASSWORD || 'Test@123456';
const students = [
    { maSV: 'QSDEMO001', hoTen: 'Nguyễn Minh Quân', gioiTinh: true, ngaySinh: '2005-02-10', phone: '0908000001' },
    { maSV: 'QSDEMO002', hoTen: 'Trần Đức Huy', gioiTinh: true, ngaySinh: '2005-04-16', phone: '0908000002' },
    { maSV: 'QSDEMO003', hoTen: 'Lê Hoàng Nam', gioiTinh: true, ngaySinh: '2005-06-22', phone: '0908000003' },
    { maSV: 'QSDEMO004', hoTen: 'Phạm Thu Hà', gioiTinh: false, ngaySinh: '2005-03-12', phone: '0908000004' },
    { maSV: 'QSDEMO005', hoTen: 'Vũ Ngọc Mai', gioiTinh: false, ngaySinh: '2005-05-18', phone: '0908000005' },
    { maSV: 'QSDEMO006', hoTen: 'Đặng Khánh Linh', gioiTinh: false, ngaySinh: '2005-07-24', phone: '0908000006' }
];

const assertDemoDatabase = () => {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
        throw new Error('Từ chối tạo dữ liệu demo trên production.');
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('Thiếu DATABASE_URL. Hãy trỏ tới database demo local trước khi seed.');
    let host;
    try {
        host = new URL(databaseUrl).hostname.toLowerCase();
    } catch {
        throw new Error('DATABASE_URL không hợp lệ; chưa tạo dữ liệu demo.');
    }

    const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
    if (!localHosts.has(host) && process.env.ALLOW_REMOTE_MILITARY_DEMO_SEED !== 'true') {
        throw new Error(`Từ chối seed vào database host "${host}". Chỉ chạy trên DB local hoặc phải bật ALLOW_REMOTE_MILITARY_DEMO_SEED=true một cách chủ động.`);
    }
};

const seedMilitaryDemoStudents = async () => {
    assertDemoDatabase();
    const officer = await prisma.user.findUnique({ where: { username: 'actor.military_officer' }, select: { id: true, role: true, isActive: true } });
    if (!officer || officer.role !== 'MILITARY_OFFICER' || !officer.isActive) {
        throw new Error('Chưa có actor.military_officer hoạt động. Hãy chạy npm run seed:demo-accounts trước.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction(async (tx) => {
        for (const [index, student] of students.entries()) {
            const account = await tx.user.upsert({
                where: { username: student.maSV },
                update: { password: passwordHash, role: 'MILITARY_STUDENT', isActive: true },
                create: { username: student.maSV, password: passwordHash, role: 'MILITARY_STUDENT', isActive: true }
            });
            const profile = {
                userId: account.id,
                hoTen: student.hoTen,
                ngaySinh: new Date(`${student.ngaySinh}T00:00:00.000Z`),
                gioiTinh: student.gioiTinh,
                lop: 'GDQP-K67',
                nienKhoa: 'K67',
                khoa: 'Học viên GDQP (demo)',
                cccd: `099800000${String(index + 1).padStart(3, '0')}`,
                phone: student.phone,
                email: `${student.maSV.toLowerCase()}@example.test`,
                dienUuTien: null,
                laHocVienQuanSu: true
            };
            await tx.sinhVien.upsert({
                where: { maSV: student.maSV },
                update: profile,
                create: { maSV: student.maSV, ...profile }
            });
        }
    }, { maxWait: 10000, timeout: 120000 });

    const roomAssignment = await assignMilitaryStudentsToA1({ db: prisma, assignedById: officer.id });
    console.log(JSON.stringify({
        seededMilitaryStudents: students.length,
        usernames: students.map((student) => student.maSV),
        sharedPassword: password,
        roomAssignment
    }, null, 2));
};

seedMilitaryDemoStudents()
    .catch((error) => {
        console.error('Không thể tạo học viên quân sự demo:', error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
