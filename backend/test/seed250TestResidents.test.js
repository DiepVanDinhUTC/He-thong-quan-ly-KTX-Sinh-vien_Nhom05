const test = require('node:test');
const assert = require('node:assert/strict');
const { planAllocation } = require('../scripts/seed250TestResidents');
const room = (maToaNha, soPhong, soSinhVienToiDa, soSinhVienHienTai = 0) => ({ maToaNha, soPhong, soSinhVienToiDa, soSinhVienHienTai, hopDongs: [], militaryRoomAssignments: [] });

test('balances additions subject to building capacity', () => {
    const groups = planAllocation([room('A1', '110', 10), room('A3', '101', 2), room('A4', '101', 10)], 10);
    assert.deepEqual(Object.fromEntries(groups.map((group) => [group.id, group.added])), { A1: 4, A3: 2, A4: 4 });
});

test('preserves military rooms and existing or cached occupancy', () => {
    const existing = room('A1', '110', 5, 3);
    existing.hopDongs = [{ maSinhVien: 'SV1', sinhVien: { gioiTinh: false } }];
    const groups = planAllocation([room('A1', '103', 8), existing], 2);
    assert.equal(groups[0].rooms[0].gender, false);
    assert.equal(groups[0].rooms[0].added, 2);
    assert.throws(() => planAllocation([room('A1', '103', 8), existing], 3), /2 chỗ/);
});
