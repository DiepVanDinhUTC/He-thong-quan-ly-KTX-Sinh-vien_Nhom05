/* Adds one identifiable batch of test data. Without --apply this only previews it. */
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes, randomUUID } = require('crypto');
const { isA1MilitaryRoom } = require('../src/config/a1Rooms');
const { defaultContractTerms } = require('../src/services/applicationApproval');

const prisma = new PrismaClient();
const BATCH = 'KTXTEST250';
const count = 250;
const surnames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const maleNames = ['An', 'Anh', 'Bảo', 'Cường', 'Đạt', 'Đức', 'Dũng', 'Hải', 'Hiếu', 'Hùng', 'Huy', 'Khánh', 'Kiên', 'Long', 'Minh', 'Nam', 'Phong', 'Phúc', 'Quân', 'Sơn', 'Thành', 'Thắng', 'Tuấn', 'Việt', 'Vinh'];
const femaleNames = ['An', 'Anh', 'Chi', 'Diệp', 'Giang', 'Hà', 'Hạnh', 'Hiền', 'Hoa', 'Hương', 'Khánh', 'Lan', 'Linh', 'Mai', 'My', 'Nga', 'Ngân', 'Nhung', 'Phương', 'Quỳnh', 'Thảo', 'Trang', 'Trâm', 'Uyên', 'Yến'];

const loadRooms = (db) => db.phong.findMany({
    where: { maToaNha: { not: null } },
    orderBy: [{ maToaNha: 'asc' }, { soPhong: 'asc' }],
    select: {
        maPhong: true, maToaNha: true, soPhong: true, loaiPhong: true, soSinhVienToiDa: true,
        soSinhVienHienTai: true, phiNoiTruThang: true,
        hopDongs: { where: { trangThai: { in: ['ACTIVE', 'PENDING_PAYMENT'] } }, select: { maSinhVien: true, sinhVien: { select: { gioiTinh: true } } } },
        militaryRoomAssignments: { where: { status: 'ACTIVE', endsAt: { gt: new Date() } }, select: { maSinhVien: true } }
    }
});

const planAllocation = (rooms, target = count) => {
    const buildings = new Map();
    for (const room of rooms) {
        if (!room.maToaNha || isA1MilitaryRoom(room) || room.militaryRoomAssignments.length) continue;
        const existingIds = new Set([...room.hopDongs, ...room.militaryRoomAssignments].map((item) => item.maSinhVien));
        const used = Math.max(room.soSinhVienHienTai, existingIds.size);
        const free = Math.max(0, room.soSinhVienToiDa - used);
        const genders = [...new Set(room.hopDongs.map((item) => item.sinhVien.gioiTinh))];
        if (!free || genders.length > 1) continue;
        if (!buildings.has(room.maToaNha)) buildings.set(room.maToaNha, []);
        buildings.get(room.maToaNha).push({ room, used, free, added: 0, gender: genders[0] });
    }
    const groups = [...buildings].sort(([a], [b]) => a.localeCompare(b)).map(([id, roomsInBuilding]) => ({ id, rooms: roomsInBuilding, added: 0 }));
    for (let i = 0; i < target; i += 1) {
        const eligible = groups.filter((group) => group.rooms.some((room) => room.added < room.free));
        eligible.sort((a, b) => a.added - b.added || a.id.localeCompare(b.id));
        if (!eligible.length) throw new Error(`Chỉ có ${i} chỗ phù hợp cho ${target} sinh viên.`);
        const group = eligible[0];
        group.rooms.find((room) => room.added < room.free).added += 1;
        group.added += 1;
    }
    return groups.filter((group) => group.added);
};

const summarize = (groups) => Object.fromEntries(groups.map((group) => [group.id, group.added]));

async function main() {
    if (!process.argv.includes('--apply')) {
        const groups = planAllocation(await loadRooms(prisma));
        console.log(JSON.stringify({ mode: 'preview', count, buildings: summarize(groups), paid: 125, pending: 125 }, null, 2));
        return;
    }
    const demoPassword = randomBytes(12).toString('base64url');
    const password = await bcrypt.hash(demoPassword, 10);
    const outcome = await prisma.$transaction(async (tx) => {
        const [existingStudents, existingUsers] = await Promise.all([
            tx.sinhVien.count({ where: { maSV: { startsWith: BATCH } } }),
            tx.user.count({ where: { username: { startsWith: BATCH } } })
        ]);
        if (existingStudents || existingUsers) throw new Error('Đã có dữ liệu KTXTEST250; dừng để tránh tạo trùng hoặc ghi đè.');
        const groups = planAllocation(await loadRooms(tx));
        const users = [], students = [], applications = [], contracts = [], receipts = [], ledger = [];
        let index = 0;
        let roomIndex = 0;
        for (const group of groups) {
            for (const candidate of group.rooms.filter((room) => room.added)) {
                const { room } = candidate;
                const gender = candidate.gender ?? (roomIndex % 2 === 0);
                roomIndex += 1;
                const terms = defaultContractTerms(room);
                if (!Number.isSafeInteger(terms.tongTien) || terms.tongTien <= 0) throw new Error(`Phí phòng ${room.maPhong} không hợp lệ.`);
                for (let j = 0; j < candidate.added; j += 1) {
                    index += 1;
                    const suffix = String(index).padStart(4, '0');
                    const maSV = `${BATCH}${suffix}`;
                    const userId = randomUUID();
                    const contractId = randomUUID();
                    const paid = index % 2 === 0;
                    const surname = surnames[(index - 1) % surnames.length];
                    const givenNames = gender ? maleNames : femaleNames;
                    const firstName = givenNames[Math.floor((index - 1) / surnames.length) % givenNames.length];
                    const middleName = gender ? 'Văn' : 'Thị';
                    const cohort = 63 + (index % 4);
                    users.push({ id: userId, username: maSV, password, role: 'STUDENT', isActive: true, updatedAt: new Date() });
                    students.push({ maSV, userId, hoTen: `${surname} ${middleName} ${firstName}`, ngaySinh: new Date(Date.UTC(2004 + index % 4, index % 12, 1 + index % 27)), gioiTinh: gender, lop: `K${cohort}-CNTT${1 + index % 5}`, nienKhoa: `K${cohort}`, khoa: 'Công nghệ thông tin', cccd: `TEST250${suffix}`, phone: `000${String(index).padStart(7, '0')}`, email: `${maSV.toLowerCase()}@example.test`, trangThaiNoiTru: paid ? 'DANG_O' : 'CHO_THANH_TOAN' });
                    applications.push({ maDangKy: randomUUID(), maSinhVien: maSV, maPhongYeuCau: room.maPhong, loaiPhongYeuCau: room.loaiPhong, trangThai: 'APPROVED' });
                    contracts.push({ maHopDong: contractId, maSinhVien: maSV, maPhong: room.maPhong, ...terms, trangThai: paid ? 'ACTIVE' : 'PENDING_PAYMENT' });
                    if (paid) {
                        receipts.push({ maHoaDon: randomUUID(), maHopDong: contractId, soTien: terms.tongTien, phuongThuc: 'TRANSFER' });
                        ledger.push({ id: randomUUID(), transactionType: 'COLLECTION', amount: terms.tongTien, method: 'TRANSFER', status: 'CONFIRMED', invoiceType: 'CONTRACT', invoiceId: contractId, maSinhVien: maSV, maToaNha: room.maToaNha, paymentReference: `${BATCH}-${suffix}`, description: 'Dữ liệu kiểm thử: thanh toán hợp đồng nội trú' });
                    }
                }
                const newCount = candidate.used + candidate.added;
                const updated = await tx.phong.updateMany({ where: { maPhong: room.maPhong, soSinhVienHienTai: room.soSinhVienHienTai, soSinhVienToiDa: room.soSinhVienToiDa }, data: { soSinhVienHienTai: newCount } });
                if (updated.count !== 1 || newCount > room.soSinhVienToiDa) throw new Error(`Sức chứa phòng ${room.maPhong} vừa thay đổi.`);
            }
        }
        await tx.user.createMany({ data: users });
        await tx.sinhVien.createMany({ data: students });
        await tx.dangKyKTX.createMany({ data: applications });
        await tx.hopDong.createMany({ data: contracts });
        await tx.hoaDon.createMany({ data: receipts });
        await tx.financialTransaction.createMany({ data: ledger });
        return { students: index, buildings: summarize(groups), paid: receipts.length, pending: count - receipts.length };
    }, { isolationLevel: 'Serializable', timeout: 120000, maxWait: 10000 });
    console.log(JSON.stringify({ ...outcome, usernames: `${BATCH}0001–${BATCH}0250`, demoPassword }, null, 2));
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
module.exports = { planAllocation };
