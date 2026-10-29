const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const { FACILITIES_MANAGER, BUILDING_MANAGER } = require('./src/config/roles');

const accounts = [
    {
        username: 'csvc.cg3t', legacyUsername: 'qltn.cg3t', maNhanVien: 'NV-QLTN-CG3T', maToaNha: 'CG_3T',
        hoTen: 'Quản lý CSVC tòa 3 tầng Cầu Giấy', legacyHoTen: 'Quản lý tòa 3 tầng Cầu Giấy',
        chucVu: 'Nhân viên quản lý cơ sở vật chất - tòa 3 tầng Cầu Giấy'
    },
    {
        username: 'csvc.cg4t', legacyUsername: 'qltn.cg4t', maNhanVien: 'NV-QLTN-CG4T', maToaNha: 'CG_4T',
        hoTen: 'Quản lý CSVC tòa 4 tầng Cầu Giấy', legacyHoTen: 'Quản lý tòa 4 tầng Cầu Giấy',
        chucVu: 'Nhân viên quản lý cơ sở vật chất - tòa 4 tầng Cầu Giấy'
    }
];
const role = FACILITIES_MANAGER;

async function seedCauGiayManagers(prisma) {
    return prisma.$transaction(async (tx) => {
        const buildings = await tx.toaNha.findMany({
            where: { maToaNha: { in: accounts.map((account) => account.maToaNha) } },
            select: { maToaNha: true, maKhu: true }
        });
        for (const account of accounts) {
            if (!buildings.some((building) => building.maToaNha === account.maToaNha && building.maKhu === 'KHU_03CG')) {
                throw new Error(`Tòa ${account.maToaNha} phải tồn tại trong khu Cầu Giấy trước khi tạo quản lý.`);
            }
        }

        const results = [];
        for (const account of accounts) {
            const candidates = await tx.user.findMany({
                where: { username: { in: [account.username, account.legacyUsername] } },
                include: { nhanVien: true, buildingAccess: true }
            });
            if (candidates.length > 1) {
                throw new Error(`Cả ${account.username} và ${account.legacyUsername} đều tồn tại; cần kiểm tra trước khi đồng bộ.`);
            }
            const existing = candidates[0];
            if (existing && (![role, BUILDING_MANAGER].includes(existing.role) || existing.nhanVien?.maNhanVien !== account.maNhanVien)) {
                throw new Error(`Tài khoản ${account.username} đã tồn tại với vai trò hoặc hồ sơ nhân viên khác.`);
            }
            if (existing?.buildingAccess.some((access) => access.maToaNha !== account.maToaNha)) {
                throw new Error(`Tài khoản ${account.username} đã được phân công tòa khác; cần kiểm tra trước khi chạy lại.`);
            }

            const password = existing ? null : randomBytes(18).toString('base64url');
            let user = existing;
            if (existing) {
                // Reuse the original account and staff ID so passwords and history stay intact.
                if (existing.username !== account.username || existing.role !== role) {
                    user = await tx.user.update({
                        where: { id: existing.id },
                        data: { username: account.username, role }
                    });
                }
                const employee = existing.nhanVien;
                const employeeChanges = {};
                if (employee.role !== role) employeeChanges.role = role;
                if (employee.chucVu !== account.chucVu) employeeChanges.chucVu = account.chucVu;
                if (employee.hoTen === account.legacyHoTen) employeeChanges.hoTen = account.hoTen;
                if (employee.email === `${account.legacyUsername}@example.test`) {
                    employeeChanges.email = `${account.username}@example.test`;
                }
                if (Object.keys(employeeChanges).length) {
                    await tx.nhanVien.update({ where: { maNhanVien: account.maNhanVien }, data: employeeChanges });
                }
            } else {
                user = await tx.user.create({
                    data: {
                        username: account.username,
                        password: await bcrypt.hash(password, 12),
                        role,
                        isActive: true,
                        nhanVien: {
                            create: {
                                maNhanVien: account.maNhanVien,
                                hoTen: account.hoTen,
                                ngaySinh: new Date('1990-01-01T00:00:00.000Z'),
                                gioiTinh: true,
                                queQuan: 'Chưa cập nhật',
                                danToc: 'Chưa cập nhật',
                                cccd: `${account.maToaNha}-CHUA-CAP-NHAT`,
                                chucVu: account.chucVu,
                                phone: '0000000000',
                                email: `${account.username}@example.test`,
                                role
                            }
                        }
                    }
                });
            }
            await tx.userBuildingAccess.upsert({
                where: { userId_maToaNha: { userId: user.id, maToaNha: account.maToaNha } },
                create: { userId: user.id, maToaNha: account.maToaNha },
                update: {}
            });
            results.push({
                username: user.username,
                maNhanVien: account.maNhanVien,
                maToaNha: account.maToaNha,
                role: user.role,
                isActive: user.isActive,
                created: !existing,
                previousUsername: existing && existing.username !== account.username ? existing.username : null,
                password
            });
        }
        return results;
    }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 120000 });
}

if (require.main === module) {
    require('dotenv').config({ quiet: true });
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    seedCauGiayManagers(prisma)
        .then((results) => console.log(JSON.stringify({ accounts: results }, null, 2)))
        .catch((error) => {
            console.error('CAU_GIAY_MANAGER_SEED_FAILED', error.code || error.name, error.message);
            process.exitCode = 1;
        })
        .finally(() => prisma.$disconnect());
}

module.exports = { seedCauGiayManagers };
