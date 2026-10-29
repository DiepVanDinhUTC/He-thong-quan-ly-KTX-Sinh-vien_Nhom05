const test = require('node:test');
const assert = require('node:assert/strict');

// Controllers use a fake database; these regressions never change real room assignments.
const prisma = {
    phong: { findMany: async () => [] },
    sinhVien: { findMany: async () => [] },
    user: { findUnique: async () => null },
    $transaction: async () => { throw new Error('Unexpected transaction'); }
};
require('../src/config/prisma');
require.cache[require.resolve('../src/config/prisma')].exports = prisma;
const { getRoomOccupancy, presentRoomOccupancy } = require('../src/services/roomOccupancy');
const rooms = require('../src/controllers/roomController');
const applications = require('../src/controllers/applicationController');
const contracts = require('../src/controllers/contractController');
const military = require('../src/controllers/militaryManagementController');
const auth = require('../src/controllers/authController');

const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});
const student = (maSV) => ({ maSV, hoTen: `Student ${maSV}`, lop: 'CLASS1', phone: '0900000000', nienKhoa: '2026-2030' });
const contract = (id, maSinhVien, trangThai = 'ACTIVE') => ({ maHopDong: id, maSinhVien, trangThai, sinhVien: student(maSinhVien) });
const assignment = (id, maSinhVien, status = 'ACTIVE') => ({ id, maSinhVien, status, sinhVien: student(maSinhVien) });
const militaryRoom = () => ({
    maPhong: 'NCT-A1-101', soPhong: '101', maToaNha: 'A1', tang: 1, loaiPhong: 'CO_BAN',
    soSinhVienToiDa: 4, soSinhVienHienTai: 4, phiNoiTruThang: 300000,
    thietBis: [], toaNha: { tenToaNha: 'A1', khu: { maKhu: 'NCT', tenKhu: 'NCT' } },
    hopDongs: [], militaryRoomAssignments: Array.from({ length: 4 }, (_, i) => assignment(`QS${i}`, `SV${i}`))
});

test('a full military room lists the same four people as its occupancy counter', () => {
    const result = getRoomOccupancy(militaryRoom());
    assert.equal(result.soSinhVienHienTai, 4);
    assert.equal(result.thanhVien.length, 4);
    assert.equal(result.soSinhVienDangO, 4);
    assert.equal(result.soHocVienQuanSu, 4);
    assert.equal(result.soChoGiuCho, 0);
    assert.equal(result.choConTrong, 0);
    assert.equal(result.trangThaiSucChua, 'DAY');
    assert.ok(result.thanhVien.every((member) => member.source === 'MILITARY' && member.maPhanPhong && member.maHopDong === null && member.trangThaiNoiTru === 'DANG_O'));
});

test('mixed occupancy counts unique students, preserves pending holds, and ignores closed records', () => {
    const result = getRoomOccupancy({
        soSinhVienToiDa: 6, soSinhVienHienTai: 99,
        hopDongs: [
            contract('HD1', 'SV1', 'PENDING_PAYMENT'), contract('HD2', 'SV1'), contract('HD3', 'SV1', 'PENDING_PAYMENT'),
            contract('HD4', 'SV2', 'PENDING_PAYMENT'), contract('HD5', 'SV3', 'PENDING_PAYMENT'),
            contract('HD6', 'SV4', 'CANCELLED'), contract('HD7', 'SV5', 'EXPIRED'), contract('HD8', 'SV6', 'RETURNED')
        ],
        militaryRoomAssignments: [assignment('QS1', 'SV3'), assignment('QS2', 'SV7'), assignment('QS3', 'SV7'), assignment('QS4', 'SV8', 'ENDED')]
    });
    assert.deepEqual(result.thanhVien.map((member) => member.maSV), ['SV1', 'SV2', 'SV3', 'SV7']);
    assert.equal(result.soSinhVienHienTai, 4);
    assert.equal(result.soSinhVienDangO, 3);
    assert.equal(result.soChoGiuCho, 1);
    assert.equal(result.soHocVienQuanSu, 2);
    assert.equal(result.choConTrong, 2);
    assert.equal(result.trangThaiSucChua, 'CON_CHO');
    assert.equal(result.thanhVien[0].maHopDong, 'HD2');
    assert.equal(result.thanhVien[2].trangThaiNoiTru, 'DANG_O');
});

test('empty and over-capacity rooms use live records without falling back to a cached count', () => {
    const empty = presentRoomOccupancy({ ...militaryRoom(), militaryRoomAssignments: [] });
    assert.equal(empty.soSinhVienHienTai, 0);
    assert.equal(empty.choConTrong, 4);
    assert.equal(empty.trangThaiSucChua, 'TRONG');
    assert.equal(empty.hopDongs, undefined);
    assert.equal(empty.militaryRoomAssignments, undefined);
    assert.equal(empty.thanhVien, undefined);
    const overfull = getRoomOccupancy({ ...militaryRoom(), soSinhVienToiDa: 3 });
    assert.equal(overfull.soSinhVienHienTai, 4);
    assert.equal(overfull.choConTrong, 0);
    assert.equal(overfull.trangThaiSucChua, 'DAY');
});

test('the management room API loads military members and derives its counter from that same list', async (t) => {
    t.mock.method(prisma.phong, 'findMany', async ({ where, include }) => {
        assert.deepEqual(where, { maToaNha: { in: ['A1'] } });
        assert.deepEqual(include.militaryRoomAssignments.where, { status: 'ACTIVE' });
        assert.deepEqual(include.hopDongs.where, { trangThai: { in: ['ACTIVE', 'PENDING_PAYMENT'] } });
        assert.equal(include.militaryRoomAssignments.include.sinhVien.select.hoTen, true);
        return [militaryRoom()];
    });
    const res = response();
    await rooms.getRooms({ buildingScope: ['A1'] }, res);
    assert.equal(res.statusCode, 200);
    const room = res.body.data[0];
    assert.equal(room.soSinhVienHienTai, room.thanhVien.length);
    assert.equal(room.soHocVienQuanSu, 4);
    assert.equal(room.choConTrong, 0);
    assert.equal(room.thanhVien[0].hoTen, 'Student SV0');
});

test('availability, contract and military room APIs use the same sources and omit member records', async (t) => {
    const full = { ...militaryRoom(), soSinhVienHienTai: 0 };
    const empty = { ...militaryRoom(), maPhong: 'NCT-A1-102', soPhong: '102', militaryRoomAssignments: [] };
    t.mock.method(prisma.phong, 'findMany', async ({ include }) => {
        assert.deepEqual(include.militaryRoomAssignments.where, { status: 'ACTIVE' });
        assert.equal(include.hopDongs.select.maSinhVien, true);
        return [full, empty];
    });
    const available = response();
    await applications.getAvailableRooms({ query: { loaiPhong: 'CO_BAN' } }, available);
    assert.equal(available.statusCode, 200);
    assert.deepEqual(available.body.data.map((item) => [item.maPhong, item.soSinhVienHienTai, item.choConTrong]), [['NCT-A1-102', 0, 4]]);
    for (const handler of [contracts.getRooms, military.getRooms]) {
        const res = response();
        await handler({ query: {}, buildingScope: null }, res);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body.data.map((item) => [item.soSinhVienHienTai, item.choConTrong]), [[4, 0], [0, 4]]);
        for (const item of res.body.data) {
            assert.equal(item.militaryRoomAssignments, undefined);
            assert.equal(item.hopDongs, undefined);
            assert.equal(item.thanhVien, undefined);
        }
    }
    assert.equal(available.body.data[0].militaryRoomAssignments, undefined);
    assert.equal(available.body.data[0].hopDongs, undefined);
});

test('a military placement appears in the student room profile with all four roommates and no roommate phone numbers', async (t) => {
    const room = militaryRoom();
    t.mock.method(prisma.user, 'findUnique', async ({ include }) => {
        assert.equal(include.sinhVien.include.militaryRoomAssignments.orderBy.assignedAt, 'desc');
        assert.ok(include.sinhVien.include.hopDongs.include.phong.include.militaryRoomAssignments);
        return {
            id: 'user0', username: 'student0', isActive: true, role: 'STUDENT',
            sinhVien: { ...student('SV0'), hopDongs: [], dangKyKTXs: [], militaryRoomAssignments: [{ id: 'QS0', maPhong: room.maPhong, assignedAt: new Date(), phong: room }] }
        };
    });
    const res = response();
    await auth.me({ user: { id: 'user0' } }, res);
    assert.equal(res.statusCode, 200);
    const user = res.body.user;
    assert.equal(user.trangThaiNoiTru, 'DANG_O');
    assert.equal(user.maPhong, room.maPhong);
    assert.equal(user.currentContract, null);
    assert.equal(user.currentResidence.source, 'MILITARY');
    assert.equal(user.currentResidence.maHopDong, null);
    assert.equal(user.currentResidence.tongTien, null);
    assert.equal(user.currentResidence.thanhVien.length, 4);
    assert.ok(user.currentResidence.thanhVien.every((member) => member.phone === undefined));
});

test('ordinary student room profiles include military roommates and pending payment holds', async (t) => {
    const room = militaryRoom();
    room.soSinhVienToiDa = 8;
    room.hopDongs = [contract('HD1', 'SV4'), contract('HD2', 'SV5', 'PENDING_PAYMENT')];
    t.mock.method(prisma.user, 'findUnique', async () => ({
        id: 'user4', isActive: true, role: 'STUDENT',
        sinhVien: { ...student('SV4'), hopDongs: [{ ...room.hopDongs[0], maPhong: room.maPhong, phong: room }] }
    }));
    const res = response();
    await auth.me({ user: { id: 'user4' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.currentContract.source, 'CONTRACT');
    assert.equal(res.body.user.currentContract.thanhVien.length, 6);
    assert.equal(res.body.user.currentContract.thanhVien.filter((member) => member.source === 'MILITARY').length, 4);
});

test('archive candidates exclude students already assigned to a military room', async (t) => {
    t.mock.method(prisma.sinhVien, 'findMany', async ({ where }) => {
        assert.equal(where.militaryRoomAssignments.none.status, 'ACTIVE');
        assert.ok(where.militaryRoomAssignments.none.endsAt.gt instanceof Date);
        return [];
    });
    const res = response();
    await rooms.getArchiveRoomCandidates({}, res);
    assert.equal(res.statusCode, 200);
});

test('archive assignment rejects an existing military resident before reserving another bed', async (t) => {
    t.mock.method(prisma, '$transaction', async (callback) => callback({
        sinhVien: { findUnique: async () => ({ maSV: 'SV1', militaryRoomAssignments: [{ id: 'QS1' }] }) },
        phong: { findUnique: async () => militaryRoom() },
        hopDong: { findFirst: async () => null },
        dangKyKTX: { findFirst: async () => null }
    }));
    const res = response();
    await rooms.assignArchiveRoom({ body: { maSinhVien: 'SV1', maPhong: 'NCT-A1-101', ngayBatDau: '2026-10-01', ngayKetThuc: '2027-03-01', tongTien: 1500000 } }, res);
    assert.equal(res.statusCode, 409);
});
