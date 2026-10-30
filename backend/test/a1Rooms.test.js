const test = require('node:test');
const assert = require('node:assert/strict');
const { buildA1RoomRows, seedA1Rooms } = require('../seedA1Rooms');
const { selectA1MilitaryRooms } = require('../src/services/militaryRoomAssignmentService');

const militaryNumbers = [
    '103', '104', '105', '106', '107',
    '201', '202', '203', '204', '205', '206', '207', '208', '209',
    '301', '302', '303', '304', '305', '306', '307', '308', '309',
    '401', '402', '403', '404', '405', '406', '407', '408', '409'
];

function fixture({ rooms = [], facilities = [], building = { maToaNha: 'A1', maKhu: 'KHU_NCT', soTang: 4 } } = {}) {
    const state = structuredClone({ rooms, facilities });
    const tx = {
        toaNha: { findUnique: async () => building },
        phong: {
            findMany: async () => state.rooms,
            update: async ({ where, data }) => Object.assign(state.rooms.find((room) => room.maPhong === where.maPhong), data),
            createMany: async ({ data }) => {
                for (const row of data) {
                    assert.ok(!state.rooms.some((room) => room.maPhong === row.maPhong));
                    state.rooms.push({ soSinhVienHienTai: 0, ...row });
                }
            }
        },
        thietBiPhong: { createMany: async ({ data }) => state.facilities.push(...data) }
    };
    const db = { $transaction: async (callback, options) => {
        assert.equal(options.isolationLevel, 'Serializable');
        const before = structuredClone(state);
        try { return await callback(tx); }
        catch (error) { Object.assign(state, before); throw error; }
    } };
    return { state, db };
}

test('A1 has 17 rooms per floor and only the 32 designated rooms use the military type', () => {
    const rows = buildA1RoomRows();
    assert.equal(new Set(rows.map((room) => room.maPhong)).size, 68);
    for (let floor = 1; floor <= 4; floor += 1) {
        assert.deepEqual(rows.filter((room) => room.tang === floor).map((room) => room.soPhong),
            Array.from({ length: 17 }, (_, index) => String(floor * 100 + index + 1)));
    }
    assert.deepEqual(rows.filter((room) => room.loaiPhong === 'PHO_THONG_KHONG_DIEU_HOA').map((room) => room.soPhong), militaryNumbers);
    assert.equal(rows.filter((room) => room.loaiPhong === 'CO_BAN').length, 24);
    assert.equal(rows.filter((room) => room.loaiPhong === 'CO_BAN_NHO').length, 12);
});

test('military selection stays within the designated rooms regardless of capacity or added rooms', () => {
    const rooms = buildA1RoomRows().map((room) => ({ ...room, soSinhVienToiDa: militaryNumbers.includes(room.soPhong) ? 4 : 100 }));
    rooms.push({ maPhong: 'A3-103', maToaNha: 'A3', soPhong: '103', tang: 1, soSinhVienToiDa: 100 });
    rooms.reverse();
    assert.deepEqual(selectA1MilitaryRooms(rooms).map((room) => room.soPhong), militaryNumbers);
    assert.deepEqual(selectA1MilitaryRooms(rooms.filter((room) => !militaryNumbers.includes(room.soPhong))), []);
});

test('seeding skips existing room numbers with custom IDs and preserves their operational data', async () => {
    const existing = { ...buildA1RoomRows()[2], maPhong: 'CUSTOM-103', loaiPhong: 'CO_BAN_NHO', soSinhVienToiDa: 4, soSinhVienHienTai: 3, phiNoiTruThang: 225000 };
    const basic = { ...buildA1RoomRows()[0], maPhong: 'CUSTOM-101', loaiPhong: 'CO_BAN_NHO', soSinhVienToiDa: 4, phiNoiTruThang: 225000 };
    const otherBuilding = { ...existing, maPhong: 'A3-103', maToaNha: 'A3' };
    const equipment = { maThietBi: 'OLD', maPhong: existing.maPhong, tenThietBi: 'Giường tầng', soLuong: 2, trangThai: 'HU_HONG' };
    const f = fixture({ rooms: [existing, basic, otherBuilding], facilities: [equipment] });
    const summary = await seedA1Rooms(f.db);
    assert.equal(summary.createdRooms, 66);
    assert.equal(summary.skippedRooms, 2);
    assert.deepEqual(summary.reclassifiedRooms, ['103']);
    assert.deepEqual(f.state.rooms.find((room) => room.maPhong === existing.maPhong), { ...existing, loaiPhong: 'PHO_THONG_KHONG_DIEU_HOA' });
    assert.deepEqual(f.state.rooms.find((room) => room.maPhong === basic.maPhong), basic);
    assert.deepEqual(f.state.rooms.find((room) => room.maPhong === otherBuilding.maPhong), otherBuilding);
    assert.ok(!f.state.rooms.some((room) => room.maPhong === 'NCT-A1-103'));
    assert.deepEqual(f.state.facilities.filter((item) => item.maPhong === existing.maPhong), [equipment]);

    const after = structuredClone(f.state);
    const rerun = await seedA1Rooms(f.db);
    assert.equal(rerun.createdRooms, 0);
    assert.equal(rerun.createdFacilities, 0);
    assert.deepEqual(rerun.reclassifiedRooms, []);
    assert.deepEqual(f.state, after);
});

test('seeding corrects a nonmilitary room type without changing its fee or capacity', async () => {
    const room = { ...buildA1RoomRows()[7], loaiPhong: 'PHO_THONG_KHONG_DIEU_HOA', phiNoiTruThang: 760000, soSinhVienToiDa: 6 };
    const f = fixture({ rooms: [room] });
    const summary = await seedA1Rooms(f.db);
    assert.deepEqual(summary.reclassifiedRooms, ['108']);
    assert.deepEqual(f.state.rooms[0], { ...room, loaiPhong: 'CO_BAN' });
});

test('new room amenities match their room type and rerunning does not duplicate equipment', async () => {
    const f = fixture();
    const summary = await seedA1Rooms(f.db);
    assert.equal(summary.createdRooms, 68);
    assert.equal(summary.createdFacilities, 268);
    const militaryFacilities = f.state.facilities.filter((item) => item.maPhong === 'NCT-A1-103');
    const basicFacilities = f.state.facilities.filter((item) => item.maPhong === 'NCT-A1-101');
    assert.ok(militaryFacilities.some((item) => item.tenThietBi === 'Bình nước nóng'));
    assert.ok(!basicFacilities.some((item) => item.tenThietBi === 'Bình nước nóng'));
    assert.equal(militaryFacilities.find((item) => item.tenThietBi === 'Giường tầng').soLuong, 4);
    const after = structuredClone(f.state);
    await seedA1Rooms(f.db);
    assert.deepEqual(f.state, after);
});

test('room-code conflicts roll back earlier reclassification instead of creating duplicates', async () => {
    const room = { ...buildA1RoomRows()[2], loaiPhong: 'CO_BAN' };
    const conflict = { ...buildA1RoomRows()[3], maToaNha: 'A3' };
    const f = fixture({ rooms: [room, conflict] });
    const before = structuredClone(f.state);
    await assert.rejects(seedA1Rooms(f.db), /đã được dùng cho phòng khác/);
    assert.deepEqual(f.state, before);
});

test('duplicate numbers or an invalid building stop the seed without writing', async () => {
    const room = buildA1RoomRows()[0];
    const duplicate = fixture({ rooms: [room, { ...room, maPhong: 'CUSTOM-101' }] });
    await assert.rejects(seedA1Rooms(duplicate.db), /số phòng trùng/);
    assert.equal(duplicate.state.facilities.length, 0);
    for (const building of [null, { maToaNha: 'A1', maKhu: 'OTHER', soTang: 4 }, { maToaNha: 'A1', maKhu: 'KHU_NCT', soTang: 3 }]) {
        const f = fixture({ building });
        await assert.rejects(seedA1Rooms(f.db), /KHU_NCT/);
        assert.equal(f.state.rooms.length, 0);
    }
});
