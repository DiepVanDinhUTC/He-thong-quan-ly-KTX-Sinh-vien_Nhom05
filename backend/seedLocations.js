require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const khuList = [
    { maKhu: 'KHU_NCT', tenKhu: 'Khu số 99 Nguyễn Chí Thanh', diaChi: 'Số 99 Nguyễn Chí Thanh, Hà Nội' },
    { maKhu: 'KHU_03CG', tenKhu: 'Khu số 3 Cầu Giấy', diaChi: 'Số 3, Cầu Giấy, Hà Nội' }
];
const buildings = [
    { maToaNha: 'A1', maKhu: 'KHU_NCT', tenToaNha: 'Tòa A1', soTang: 4 },
    { maToaNha: 'A4', maKhu: 'KHU_NCT', tenToaNha: 'Tòa A4', soTang: 4 },
    { maToaNha: 'A3', maKhu: 'KHU_NCT', tenToaNha: 'Tòa A3', soTang: 4 },
    { maToaNha: 'A5', maKhu: 'KHU_NCT', tenToaNha: 'Tòa A5', soTang: 3 },
    { maToaNha: 'A6', maKhu: 'KHU_NCT', tenToaNha: 'Tòa A6', soTang: 5 },
    { maToaNha: 'A2', maKhu: 'KHU_03CG', tenToaNha: 'Tòa A2', soTang: 0 },
    { maToaNha: 'CG_3T', maKhu: 'KHU_03CG', tenToaNha: 'Tòa nhà 3 tầng', soTang: 3 },
    { maToaNha: 'CG_4T', maKhu: 'KHU_03CG', tenToaNha: 'Tòa nhà 4 tầng', soTang: 4 }
];

async function main() {
    for (const khu of khuList) {
        await prisma.khu.upsert({
            where: { maKhu: khu.maKhu },
            create: khu,
            update: { tenKhu: khu.tenKhu, diaChi: khu.diaChi }
        });
    }
    for (const building of buildings) {
        await prisma.toaNha.upsert({
            where: { maToaNha: building.maToaNha },
            create: building,
            update: {
                maKhu: building.maKhu,
                tenToaNha: building.tenToaNha,
                soTang: building.soTang
            }
        });
    }
    console.log(`Đã bảo đảm ${khuList.length} khu và ${buildings.length} tòa nhà trong database.`);
}

main()
    .catch((error) => {
        console.error('Không thể khởi tạo danh mục khu:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
