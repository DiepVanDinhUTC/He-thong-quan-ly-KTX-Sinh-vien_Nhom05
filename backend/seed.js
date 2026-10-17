const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log("Bắt đầu dọn dẹp dữ liệu cũ (nếu có)...");
    
    // Đảm bảo không bị lỗi trùng lặp khi chạy lại seed nhiều lần
    await prisma.hoaDon.deleteMany({});
    await prisma.hopDong.deleteMany({});
    await prisma.dangKyKTX.deleteMany({});
    await prisma.sinhVien.deleteMany({});
    await prisma.nhanVien.deleteMany({});
    await prisma.user.deleteMany({});

    console.log("Bắt đầu tạo dữ liệu test mới...");

    // Mã hóa mật khẩu chung là '123456'
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);

    // 1. Tạo tài khoản Sinh Viên (STUDENT)
    const studentUser = await prisma.user.create({
        data: {
            username: '231230743',
            password: hashedPassword,
            role: 'STUDENT',
            sinhVien: {
                create: {
                    maSV: '231230743',
                    hoTen: 'Đinh Văn Điệp',
                    ngaySinh: new Date('2004-01-01'),
                    gioiTinh: true,
                    lop: 'CNTT',
                    khoa: 'Công nghệ thông tin',
                    cccd: '001204123456',
                    phone: '0987654321',
                    email: 'diep@utc.edu.vn',
                }
            }
        }
    });
    console.log("✅ Đã tạo User Sinh viên:", studentUser.username);

    // 2. Tạo tài khoản Quản lý (MANAGER)
    const managerUser = await prisma.user.create({
        data: {
            username: 'admin.manager',
            password: hashedPassword,
            role: 'MANAGER',
            nhanVien: {
                create: {
                    maNhanVien: 'NV_MGR01',
                    hoTen: 'Nguyễn Trưởng Ban',
                    ngaySinh: new Date('1985-05-15'),
                    gioiTinh: true,
                    queQuan: 'Hà Nội',
                    danToc: 'Kinh',
                    cccd: '001085111111',
                    chucVu: 'Quản lý KTX',
                    phone: '0911111111',
                    email: 'manager@utc.edu.vn'
                }
            }
        }
    });
    console.log("✅ Đã tạo User Quản lý:", managerUser.username);

    // 3. Tạo tài khoản Kế toán (ACCOUNTANT)
    const accountantUser = await prisma.user.create({
        data: {
            username: 'admin.accountant',
            password: hashedPassword,
            role: 'ACCOUNTANT',
            nhanVien: {
                create: {
                    maNhanVien: 'NV_ACC01',
                    hoTen: 'Trần Thị Kế Toán',
                    ngaySinh: new Date('1990-08-20'),
                    gioiTinh: false,
                    queQuan: 'Hà Nam',
                    danToc: 'Kinh',
                    cccd: '001090222222',
                    chucVu: 'Kế toán viên',
                    phone: '0922222222',
                    email: 'accountant@utc.edu.vn'
                }
            }
        }
    });
    console.log("✅ Đã tạo User Kế toán:", accountantUser.username);

    // 4. Tạo tài khoản Kỹ thuật (TECHNICIAN)
    const technicianUser = await prisma.user.create({
        data: {
            username: 'admin.tech',
            password: hashedPassword,
            role: 'TECHNICIAN',
            nhanVien: {
                create: {
                    maNhanVien: 'NV_TEC01',
                    hoTen: 'Lê Văn Kỹ Thuật',
                    ngaySinh: new Date('1988-11-10'),
                    gioiTinh: true,
                    queQuan: 'Hưng Yên',
                    danToc: 'Kinh',
                    cccd: '001088333333',
                    chucVu: 'Tổ trưởng bảo trì',
                    phone: '0933333333',
                    email: 'tech@utc.edu.vn'
                }
            }
        }
    });
    console.log("✅ Đã tạo User Kỹ thuật:", technicianUser.username);

    // 5. Tạo tài khoản Giám đốc (DIRECTOR)
    const directorUser = await prisma.user.create({
        data: {
            username: 'admin.director',
            password: hashedPassword,
            role: 'DIRECTOR',
            nhanVien: {
                create: {
                    maNhanVien: 'NV_DIR01',
                    hoTen: 'Phạm Giám Đốc',
                    ngaySinh: new Date('1975-02-28'),
                    gioiTinh: true,
                    queQuan: 'Hà Nội',
                    danToc: 'Kinh',
                    cccd: '001075444444',
                    chucVu: 'Giám đốc Trung tâm KTX',
                    phone: '0944444444',
                    email: 'director@utc.edu.vn'
                }
            }
        }
    });
    console.log("✅ Đã tạo User Giám đốc:", directorUser.username);
}

main()
    .catch((e) => {
        console.error("❌ Lỗi khi tạo dữ liệu:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        console.log("Hoàn tất quy trình Seed.");
    });
