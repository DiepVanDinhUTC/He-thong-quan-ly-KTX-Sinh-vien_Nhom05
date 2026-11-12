const test = require('node:test');
const assert = require('node:assert/strict');
const { generateQldtRegistrations, createQldtMilitarySync } = require('../src/services/qldtMilitarySyncService');

const memoryDb = () => {
    const users = new Map();
    const students = new Map();
    const tx = {
        user: {
            findUnique: async ({ where }) => where.username ? users.get(where.username) || null : [...users.values()].find((user) => user.id === where.id) || null,
            create: async ({ data }) => { const user = { ...data, id: data.username }; users.set(user.username, user); return user; }
        },
        sinhVien: {
            findUnique: async ({ where }) => students.get(where.maSV) || null,
            create: async ({ data }) => { students.set(data.maSV, data); return data; }
        }
    };
    return { students, $transaction: async (callback) => callback(tx) };
};

test('QLĐT mock creates 50 distinct random profiles for each call', () => {
    const first = generateQldtRegistrations();
    const second = generateQldtRegistrations();
    assert.equal(first.length, 50);
    assert.equal(new Set([...first, ...second].map((item) => item.student.maSV)).size, 100);
    assert.equal(new Set([...first, ...second].map((item) => item.student.cccd)).size, 100);
    assert.equal(first.filter((item) => item.student.gioiTinh).length, 25);
});

test('QLĐT sync creates profiles and assigns only this batch, including on repeated calls', async () => {
    const db = memoryDb();
    const calls = [];
    const run = createQldtMilitarySync({ db, hashPassword: async () => 'hash', assign: async (options) => {
        calls.push(options);
        return { assigned: 48, unassignedCount: 2 };
    } });
    const first = await run({ assignedById: 'officer' });
    const second = await run({ assignedById: 'officer' });
    assert.equal(first.createdAccounts, 50);
    assert.equal(second.createdAccounts, 50);
    assert.equal(db.students.size, 100);
    assert.equal(calls[0].assignedById, 'officer');
    assert.deepEqual(calls[0].studentIds, first.studentIds);
    assert.equal(first.roomAssignment.unassignedCount, 2);
});

test('QLĐT sync reports assignment failure without hiding already created profiles', async () => {
    const db = memoryDb();
    const run = createQldtMilitarySync({ db, hashPassword: async () => 'hash', assign: async () => { throw Object.assign(new Error('Chưa có phòng A1'), { status: 409 }); } });
    const result = await run({ assignedById: 'officer' });
    assert.equal(result.createdAccounts, 50);
    assert.equal(result.roomAssignmentError, 'Chưa có phòng A1');
    assert.equal(db.students.size, 50);
});

test('automatic placement handles the full 32-room A1 inventory and respects gender and capacity', async () => {
    const { assignMilitaryStudentsToA1 } = require('../src/services/militaryRoomAssignmentService');
    const { A1_MILITARY_ROOM_NUMBERS } = require('../src/config/a1Rooms');
    const rooms = A1_MILITARY_ROOM_NUMBERS.map((number) => ({ maPhong: `A1-${number}`, maToaNha: 'A1', soPhong: number, tang: Number(number[0]), soSinhVienToiDa: 4, soSinhVienHienTai: 0, hopDongs: [], militaryRoomAssignments: [] }));
    const students = Array.from({ length: 50 }, (_, i) => ({ maSV: `SV${i}`, gioiTinh: i % 2 === 0, militaryRoomAssignments: [] }));
    const created = [];
    const tx = {
        sinhVien: { findMany: async () => students },
        militaryRoomAssignment: { findMany: async () => [], create: async ({ data }) => { created.push(data); return data; } },
        phong: { findMany: async () => rooms, updateMany: async () => ({ count: 1 }) }
    };
    const result = await assignMilitaryStudentsToA1({ db: { $transaction: async (fn) => fn(tx) }, assignedById: 'officer' });
    assert.equal(result.assigned, 50);
    assert.equal(result.unassignedCount, 0);
    for (const room of rooms) {
        const residents = created.filter((item) => item.maPhong === room.maPhong);
        assert.ok(residents.length <= room.soSinhVienToiDa);
        assert.ok(new Set(residents.map((item) => students.find((student) => student.maSV === item.maSinhVien).gioiTinh)).size <= 1);
    }
});
