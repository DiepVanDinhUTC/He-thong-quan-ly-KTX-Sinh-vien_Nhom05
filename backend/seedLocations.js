require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const campuses = [
    { maCoSo: 'CS_99NCT', tenCoSo: 'Cơ sở 99 Nguyễn Chí Thanh', diaChi: '99 Nguyễn Chí Thanh, Hà Nội' },
    { maCoSo: 'CS_03CG', tenCoSo: 'Cơ sở 3 Cầu Giấy', diaChi: '3 Cầu Giấy, Hà Nội' }
];

async function main() {
    for (const campus of campuses) {
        await prisma.$executeRaw`
            IF EXISTS (SELECT 1 FROM [CO_SO] WHERE maCoSo = ${campus.maCoSo})
                UPDATE [CO_SO]
                SET tenCoSo = ${campus.tenCoSo}, diaChi = ${campus.diaChi}
                WHERE maCoSo = ${campus.maCoSo}
            ELSE
                INSERT INTO [CO_SO] (maCoSo, tenCoSo, diaChi)
                VALUES (${campus.maCoSo}, ${campus.tenCoSo}, ${campus.diaChi})
        `;
    }
    console.log(`Đã bảo đảm có ${campuses.length} cơ sở trong database.`);
}

main()
    .catch((error) => {
        console.error('Không thể khởi tạo danh mục cơ sở:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
