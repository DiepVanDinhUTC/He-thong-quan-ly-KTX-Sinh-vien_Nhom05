require('dotenv').config();

const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const buildings = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
const accounts = [
    ...buildings.map((building, index) => ({
        username: `csvc.${building.toLowerCase()}`,
        role: 'FACILITIES_MANAGER',
        building,
        maNhanVien: `NV-CSVC-${building}`,
        hoTen: `Quản lý CSVC tòa ${building}`,
        chucVu: `Nhân viên quản lý cơ sở vật chất - tòa ${building}`,
        cccd: `0999000000000000${String(index + 1).padStart(2, '0')}`,
        phone: `09000000${String(index + 1).padStart(2, '0')}`
    })),
    {
        username: 'nhaxe.a5',
        role: 'SERVICE_PROVIDER',
        building: 'A5',
        maNhanVien: 'NV-NHAXE-A5',
        hoTen: 'Nhà cung cấp dịch vụ nhà xe A5',
        chucVu: 'Nhà cung cấp dịch vụ - nhà xe A5',
        cccd: '099900000000000007',
        phone: '0900000007'
    }
];

async function ensureEmployee(tx, account, userId) {
    const employeeForUser = await tx.nhanVien.findUnique({ where: { userId } });
    if (employeeForUser) return employeeForUser;

    const employeeByCode = await tx.nhanVien.findUnique({ where: { maNhanVien: account.maNhanVien } });
    if (employeeByCode && employeeByCode.userId && employeeByCode.userId !== userId) {
        throw new Error(`Mã nhân viên ${account.maNhanVien} đã thuộc về tài khoản khác.`);
    }

    const employeeData = {
        userId,
        hoTen: account.hoTen,
        ngaySinh: new Date('1990-01-01T00:00:00.000Z'),
        gioiTinh: true,
        queQuan: 'Chưa cập nhật',
        danToc: 'Kinh',
        cccd: account.cccd,
        chucVu: account.chucVu,
        phone: account.phone,
        email: `${account.username}@ktx.local`
    };

    if (employeeByCode) {
        return tx.nhanVien.update({ where: { maNhanVien: account.maNhanVien }, data: { userId } });
    }

    return tx.nhanVien.create({ data: { maNhanVien: account.maNhanVien, ...employeeData } });
}

async function seedFacilitiesAccounts() {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_STAFF_ACCOUNT_SEED !== 'true') {
        throw new Error('Trên production, cần đặt ALLOW_STAFF_ACCOUNT_SEED=true để tạo tài khoản nhân viên.');
    }

    const existingBuildings = await prisma.toaNha.findMany({
        where: { maToaNha: { in: buildings } },
        select: { maToaNha: true }
    });
    const existingBuildingIds = new Set(existingBuildings.map(({ maToaNha }) => maToaNha));
    const missingBuildings = buildings.filter((building) => !existingBuildingIds.has(building));
    if (missingBuildings.length) {
        throw new Error(`Không tìm thấy tòa nhà: ${missingBuildings.join(', ')}. Hãy tạo dữ liệu tòa nhà trước.`);
    }

    const results = await prisma.$transaction(async (tx) => {
        const created = [];
        for (const accountInput of accounts) {
            const existing = await tx.user.findUnique({ where: { username: accountInput.username } });
            if (existing && existing.role !== accountInput.role) {
                throw new Error(`Tài khoản ${accountInput.username} đã tồn tại với vai trò ${existing.role}.`);
            }

            const initialPassword = existing ? null : randomBytes(18).toString('base64url');
            const passwordHash = initialPassword ? await bcrypt.hash(initialPassword, 12) : undefined;
            const user = existing
                ? await tx.user.update({
                    where: { id: existing.id },
                    data: { isActive: true }
                })
                : await tx.user.create({
                    data: {
                        username: accountInput.username,
                        password: passwordHash,
                        role: accountInput.role,
                        isActive: true
                    }
                });

            await ensureEmployee(tx, accountInput, user.id);

            // These are dedicated accounts; retain access only to their assigned building.
            await tx.userBuildingAccess.deleteMany({
                where: { userId: user.id, maToaNha: { not: accountInput.building } }
            });
            await tx.userBuildingAccess.upsert({
                where: { userId_maToaNha: { userId: user.id, maToaNha: accountInput.building } },
                create: { userId: user.id, maToaNha: accountInput.building },
                update: {}
            });

            created.push({
                username: user.username,
                role: user.role,
                building: accountInput.building,
                status: existing ? 'đã tồn tại, giữ mật khẩu hiện tại' : 'đã tạo',
                password: initialPassword
            });
        }
        return created;
    }, { maxWait: 10000, timeout: 120000 });

    console.log(JSON.stringify({ accounts: results }, null, 2));
}

seedFacilitiesAccounts()
    .catch((error) => {
        console.error('Không thể tạo tài khoản CSVC/nhà cung cấp:', error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
