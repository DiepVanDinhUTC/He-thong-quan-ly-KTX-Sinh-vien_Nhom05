require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    await prisma.$transaction(async (tx) => {
        const columns = await tx.$queryRaw`SELECT COL_LENGTH('dbo.SINH_VIEN', 'nienKhoa') AS columnLength`;
        if (columns[0]?.columnLength === null) {
            await tx.$executeRawUnsafe('ALTER TABLE [dbo].[SINH_VIEN] ADD [nienKhoa] NVARCHAR(3) NULL');
        }

        await tx.$executeRawUnsafe(`UPDATE [dbo].[SINH_VIEN]
            SET [nienKhoa] = CASE
                WHEN PATINDEX('%K6[2-7]%', UPPER(ISNULL([lop], ''))) > 0
                    THEN SUBSTRING(UPPER([lop]), PATINDEX('%K6[2-7]%', UPPER(ISNULL([lop], ''))), 3)
                WHEN TRY_CONVERT(INT, LEFT([maSV], 2)) BETWEEN 21 AND 26
                    THEN CONCAT('K', TRY_CONVERT(INT, LEFT([maSV], 2)) + 41)
                WHEN [maSV] LIKE 'SIS2[1-6]%'
                    THEN CONCAT('K', TRY_CONVERT(INT, SUBSTRING([maSV], 4, 2)) + 41)
                ELSE CONCAT('K', 62 + ABS(CHECKSUM([maSV]) % 6))
            END
            WHERE [nienKhoa] IS NULL OR [nienKhoa] NOT IN ('K62', 'K63', 'K64', 'K65', 'K66', 'K67')`);

        await tx.$executeRawUnsafe('ALTER TABLE [dbo].[SINH_VIEN] ALTER COLUMN [nienKhoa] NVARCHAR(3) NOT NULL');
        const defaults = await tx.$queryRaw`SELECT 1 AS hasDefault
            FROM sys.default_constraints AS dc
            INNER JOIN sys.columns AS c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
            WHERE dc.parent_object_id = OBJECT_ID('dbo.SINH_VIEN') AND c.name = 'nienKhoa'`;
        if (!defaults.length) {
            await tx.$executeRawUnsafe("ALTER TABLE [dbo].[SINH_VIEN] ADD CONSTRAINT [DF_SINH_VIEN_nienKhoa] DEFAULT ('K64') FOR [nienKhoa]");
        }
    }, { timeout: 60000 });

    const distribution = await prisma.$queryRaw`SELECT nienKhoa, COUNT(*) AS soLuong
        FROM [SINH_VIEN] GROUP BY nienKhoa ORDER BY nienKhoa`;
    console.log('Đã hoàn tất bổ sung niên khóa. Phân bố:', distribution);
}

main().catch((error) => {
    console.error('Không thể bổ sung niên khóa:', error.message);
    process.exitCode = 1;
}).finally(async () => {
    await prisma.$disconnect();
});
