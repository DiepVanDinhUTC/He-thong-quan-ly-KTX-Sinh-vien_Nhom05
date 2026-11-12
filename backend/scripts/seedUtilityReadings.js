/* Synthetic readings for billing tests. Preview by default; --apply inserts missing readings. */
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const marker = 'Dữ liệu kiểm thử tự tạo, không phải chỉ số công tơ thực tế.';

function parsePeriod(value) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')) throw new Error('Kỳ phải có dạng YYYY-MM.');
    const [year, month] = value.split('-').map(Number);
    if (year < 2000 || year > 2100) throw new Error('Năm phải từ 2000 đến 2100.');
    return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

function currentPeriod() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
    return `${parts.find((part) => part.type === 'year').value}-${parts.find((part) => part.type === 'month').value}`;
}

function planReadings(contracts, readings, periodStart, recordedById) {
    const roomIds = [...new Set(contracts.map((contract) => contract.maPhong))].sort();
    const planned = [];
    let existing = 0;
    let blockedByLaterReading = 0;
    for (const maPhong of roomIds) {
        // Stable values keep previews repeatable, independent of query ordering.
        const hash = [...maPhong].reduce((value, char) => (value * 31 + char.charCodeAt(0)) % 10000, 0);
        for (const utilityType of ['ELECTRICITY', 'WATER']) {
            const history = readings.filter((row) => row.maPhong === maPhong && row.utilityType === utilityType);
            if (history.some((row) => row.periodStart.getTime() === periodStart.getTime())) { existing += 1; continue; }
            if (history.some((row) => row.periodStart > periodStart)) { blockedByLaterReading += 1; continue; }
            const previous = history.filter((row) => row.periodStart < periodStart).sort((a, b) => b.periodStart - a.periodStart)[0];
            const previousReading = previous?.currentReading ?? (utilityType === 'ELECTRICITY' ? 1000 + hash : 100 + hash % 500);
            const usage = utilityType === 'ELECTRICITY' ? 60 + hash % 121 : 5 + hash % 16;
            if (previousReading + usage > 2147483647) throw new Error(`Chỉ số phòng ${maPhong} vượt giới hạn.`);
            planned.push({ maPhong, utilityType, periodStart, previousReading, currentReading: previousReading + usage, memo: marker, recordedById });
        }
    }
    return { rooms: roomIds.length, existing, blockedByLaterReading, planned };
}

async function main() {
    const periodArg = process.argv.find((arg) => arg.startsWith('--period='))?.slice(9) || currentPeriod();
    const username = process.argv.find((arg) => arg.startsWith('--user='))?.slice(7);
    const period = parsePeriod(periodArg);
    if (period.start > parsePeriod(currentPeriod()).start) throw new Error('Không thể tạo chỉ số cho kỳ tương lai.');
    const actor = username
        ? await prisma.user.findFirst({ where: { username, isActive: true, role: 'ADMIN' }, select: { id: true, username: true } })
        : await prisma.user.findFirst({ where: { isActive: true, role: 'ADMIN' }, orderBy: { username: 'asc' }, select: { id: true, username: true } });
    if (!actor) throw new Error('Cần một tài khoản ADMIN đang hoạt động để ghi nhận dữ liệu kiểm thử.');

    const result = await prisma.$transaction(async (tx) => {
        const [contracts, militaryAssignments] = await Promise.all([
            tx.hopDong.findMany({
                where: { trangThai: 'ACTIVE', ngayBatDau: { lt: period.end }, ngayKetThuc: { gte: period.start } },
                select: { maPhong: true }
            }),
            tx.militaryRoomAssignment.findMany({
                where: { status: 'ACTIVE', startsAt: { lt: period.end }, endsAt: { gt: period.start } },
                select: { maPhong: true }
            })
        ]);
        const occupants = [...contracts, ...militaryAssignments];
        const readings = await tx.utilityMeterReading.findMany({
            where: { maPhong: { in: [...new Set(occupants.map((occupant) => occupant.maPhong))] } },
            select: { maPhong: true, utilityType: true, periodStart: true, currentReading: true }
        });
        const plan = planReadings(occupants, readings, period.start, actor.id);
        if (process.argv.includes('--apply') && plan.planned.length) {
            await tx.utilityMeterReading.createMany({ data: plan.planned });
        }
        return { mode: process.argv.includes('--apply') ? 'apply' : 'preview', period: periodArg, recordedBy: actor.username, rooms: plan.rooms, existing: plan.existing, blockedByLaterReading: plan.blockedByLaterReading, readingsToCreate: plan.planned.length };
    }, { isolationLevel: 'Serializable', timeout: 120000, maxWait: 10000 });
    console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
module.exports = { parsePeriod, planReadings };
