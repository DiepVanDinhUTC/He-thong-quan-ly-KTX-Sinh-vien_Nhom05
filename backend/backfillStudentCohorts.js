require('dotenv').config();
const prisma = require('./src/config/prisma');

const validCohorts = new Set(['K62', 'K63', 'K64', 'K65', 'K66', 'K67']);

const inferCohort = ({ maSV, lop }) => {
    const fromClass = String(lop || '').toUpperCase().match(/K6[2-7]/);
    if (fromClass) return fromClass[0];

    const studentCode = String(maSV || '').toUpperCase();
    const yearPrefix = Number(studentCode.slice(0, 2));
    if (yearPrefix >= 21 && yearPrefix <= 26) return `K${yearPrefix + 41}`;

    const sisYear = studentCode.match(/^SIS(2[1-6])/);
    if (sisYear) return `K${Number(sisYear[1]) + 41}`;

    const stableHash = [...studentCode].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return `K${62 + (stableHash % 6)}`;
};

async function main() {
    const students = await prisma.sinhVien.findMany({ select: { maSV: true, lop: true, nienKhoa: true } });
    let updated = 0;
    for (const student of students) {
        if (validCohorts.has(student.nienKhoa)) continue;
        await prisma.sinhVien.update({ where: { maSV: student.maSV }, data: { nienKhoa: inferCohort(student) } });
        updated += 1;
    }
    const distribution = await prisma.sinhVien.groupBy({ by: ['nienKhoa'], _count: { _all: true }, orderBy: { nienKhoa: 'asc' } });
    console.log(`Đã cập nhật niên khóa cho ${updated} sinh viên. Phân bố:`, distribution);
}

main().catch((error) => {
    console.error('Không thể bổ sung niên khóa:', error.message);
    process.exitCode = 1;
}).finally(async () => {
    await prisma.$disconnect();
});
