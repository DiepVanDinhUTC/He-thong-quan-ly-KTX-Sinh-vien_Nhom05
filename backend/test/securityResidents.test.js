const test = require('node:test');
const assert = require('node:assert/strict');
const room = { maPhong: 'A1', soPhong: '101', maToaNha: 'A', toaNha: { tenToaNha: 'A', maKhu: 'K' } };
const prisma = {
    toaNha: { findMany: async () => [] },
    sinhVien: { findMany: async ({ where }) => {
        assert.ok(where.OR.some((part) => part.militaryRoomAssignments));
        return [{ maSV: 'SV1', hoTen: 'Sinh viên', hopDongs: [], militaryRoomAssignments: [{ maPhong: 'A1', phong: room }] }];
    } },
    militaryRoomAssignment: { findFirst: async () => ({ maPhong: 'A1', phong: room }) },
    securityViolation: { create: async ({ data }) => data }
};
require('../src/config/prisma');
require.cache[require.resolve('../src/config/prisma')].exports = prisma;
const controller = require('../src/controllers/securityMedicalController');
const response = () => ({ status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('military residents are found and violations use their current room', async () => {
    const directory = response();
    await controller.getResidents({ buildingScope: null }, directory);
    assert.equal(directory.body.data.residents[0].maSV, 'SV1');
    const created = response();
    await controller.createViolation({ buildingScope: null, user: { id: 'security' }, body: { maSinhVien: 'SV1', category: 'NOISE', description: 'Vi phạm nội quy' } }, created);
    assert.equal(created.statusCode, 201);
    assert.equal(created.body.data.maPhong, 'A1');
    assert.equal(created.body.data.maToaNha, 'A');
});
