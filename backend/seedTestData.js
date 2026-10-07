require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const password = bcrypt.hashSync('Test@12345', 10);
const now = new Date();
const dateAt = (daysFromNow) => new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
let currentFixtureStep = 'starting';

async function main() {
    const users = [];
    for (let index = 1; index <= 20; index += 1) {
        const isStudent = index <= 10;
        const sequence = isStudent ? index : index - 10;
        const username = isStudent
            ? `test10_sv${String(sequence).padStart(2, '0')}`
            : `test10_nv${String(sequence).padStart(2, '0')}`;
        const role = isStudent
            ? 'STUDENT'
            : ['MANAGER', 'ACCOUNTANT', 'TECHNICIAN', 'DIRECTOR', 'MANAGER'][((sequence - 1) % 5)];
        currentFixtureStep = `user ${username}`;
        users.push(await prisma.user.upsert({
            where: { username },
            update: { password, role, isActive: true },
            create: { username, password, role, isActive: true }
        }));
    }

    const students = [];
    for (let index = 1; index <= 10; index += 1) {
        const suffix = String(index).padStart(2, '0');
        currentFixtureStep = `student T10SV${suffix}`;
        students.push(await prisma.sinhVien.upsert({
            where: { maSV: `T10SV${suffix}` },
            update: {
                userId: users[index - 1].id,
                hoTen: `Sinh viên kiểm thử ${suffix}`,
                trangThaiNoiTru: 'DANG_O',
                phone: `090100${String(index).padStart(4, '0')}`,
                email: `test10.sv${suffix}@example.test`
            },
            create: {
                maSV: `T10SV${suffix}`,
                userId: users[index - 1].id,
                hoTen: `Sinh viên kiểm thử ${suffix}`,
                ngaySinh: new Date(Date.UTC(2002 + (index % 5), index % 12, index + 1)),
                gioiTinh: index % 2 === 1,
                lop: `T10-CT${index}`,
                khoa: 'Công nghệ thông tin',
                cccd: `T10CCCDSV${suffix}`,
                phone: `090100${String(index).padStart(4, '0')}`,
                email: `test10.sv${suffix}@example.test`,
                trangThaiNoiTru: 'DANG_O'
            }
        }));
    }

    const employees = [];
    for (let index = 1; index <= 10; index += 1) {
        const suffix = String(index).padStart(2, '0');
        currentFixtureStep = `employee T10NV${suffix}`;
        const roles = ['Quản lý KTX', 'Kế toán', 'Kỹ thuật viên', 'Giám đốc', 'Quản lý KTX'];
        employees.push(await prisma.nhanVien.upsert({
            where: { maNhanVien: `T10NV${suffix}` },
            update: {
                userId: users[index + 9].id,
                hoTen: `Nhân viên kiểm thử ${suffix}`,
                phone: `091100${String(index).padStart(4, '0')}`,
                email: `test10.nv${suffix}@example.test`
            },
            create: {
                maNhanVien: `T10NV${suffix}`,
                userId: users[index + 9].id,
                hoTen: `Nhân viên kiểm thử ${suffix}`,
                ngaySinh: new Date(Date.UTC(1980 + index, index % 12, index + 1)),
                gioiTinh: index % 2 === 1,
                queQuan: 'Hà Nội',
                danToc: 'Kinh',
                cccd: `T10CCCDNV${suffix}`,
                chucVu: roles[index - 1] || 'Nhân viên KTX',
                phone: `091100${String(index).padStart(4, '0')}`,
                email: `test10.nv${suffix}@example.test`
            }
        }));
    }

    const rooms = [];
    for (let index = 1; index <= 10; index += 1) {
        const suffix = String(index).padStart(2, '0');
        currentFixtureStep = `room T10PH${suffix}`;
        rooms.push(await prisma.phong.upsert({
            where: { maPhong: `T10PH${suffix}` },
            update: { soSinhVienHienTai: index === 6 ? 8 : 0 },
            create: {
                maPhong: `T10PH${suffix}`,
                soPhong: `T10-${suffix}`,
                loaiPhong: index % 2 === 0 ? 'DIEU_HOA' : 'QUAT',
                soSinhVienToiDa: 8,
                soSinhVienHienTai: index === 6 ? 8 : 0
            }
        }));
    }

    const applications = [];
    const applicationStates = ['PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'APPROVED', 'REJECTED', 'REJECTED'];
    for (let index = 1; index <= 10; index += 1) {
        const suffix = String(index).padStart(2, '0');
        currentFixtureStep = `application T10-DK-${suffix}`;
        applications.push(await prisma.dangKyKTX.upsert({
            where: { maDangKy: `T10-DK-${suffix}` },
            update: {
                maSinhVien: students[index - 1].maSV,
                loaiPhongYeuCau: index % 2 === 0 ? 'DIEU_HOA' : 'QUAT',
                trangThai: applicationStates[index - 1]
            },
            create: {
                maDangKy: `T10-DK-${suffix}`,
                maSinhVien: students[index - 1].maSV,
                ngayDangKy: dateAt(-index),
                loaiPhongYeuCau: index % 2 === 0 ? 'DIEU_HOA' : 'QUAT',
                trangThai: applicationStates[index - 1]
            }
        }));
    }

    const contractStates = ['CANCELLED', 'CANCELLED', 'CANCELLED', 'CANCELLED', 'CANCELLED', 'CANCELLED', 'PENDING_PAYMENT', 'PAID', 'CANCELLED', 'PENDING_PAYMENT'];
    const contracts = [];
    for (let index = 1; index <= 10; index += 1) {
        const suffix = String(index).padStart(2, '0');
        currentFixtureStep = `contract T10-HD-${suffix}`;
        contracts.push(await prisma.hopDong.upsert({
            where: { maHopDong: `T10-HD-${suffix}` },
            update: {
                maSinhVien: students[index - 1].maSV,
                maPhong: rooms[index - 1].maPhong,
                trangThai: contractStates[index - 1]
            },
            create: {
                maHopDong: `T10-HD-${suffix}`,
                maSinhVien: students[index - 1].maSV,
                maPhong: rooms[index - 1].maPhong,
                ngayBatDau: dateAt(-30),
                ngayKetThuc: dateAt(335),
                tongTien: 1200000,
                trangThai: contractStates[index - 1],
                ngayTao: index === 10 ? dateAt(-3) : now
            }
        }));
    }

    for (let index = 1; index <= 10; index += 1) {
        const suffix = String(index).padStart(2, '0');
        currentFixtureStep = `invoice T10-HDON-${suffix}`;
        await prisma.hoaDon.upsert({
            where: { maHoaDon: `T10-HDON-${suffix}` },
            update: {
                maHopDong: contracts[index - 1].maHopDong,
                nguoiThu: employees[index - 1].maNhanVien
            },
            create: {
                maHoaDon: `T10-HDON-${suffix}`,
                maHopDong: contracts[index - 1].maHopDong,
                soTien: 1200000,
                phuongThuc: 'TRANSFER',
                ngayThanhToan: dateAt(-index),
                nguoiThu: employees[index - 1].maNhanVien
            }
        });
    }

    console.log('TEST10 fixture ready: 10 records in SinhVien, NhanVien, Phong, DangKyKTX, HopDong, and HoaDon, plus 20 linked User accounts.');
    console.log('Manager test login: test10_nv01 / Test@12345');
    console.log('Student test login: test10_sv01 / Test@12345');
    console.log('Fixture IDs use the T10 prefix and this script is safe to rerun.');
}

main()
    .catch((error) => {
        console.error(`Could not seed test data at ${currentFixtureStep}:`, error.message, error.meta || '');
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
