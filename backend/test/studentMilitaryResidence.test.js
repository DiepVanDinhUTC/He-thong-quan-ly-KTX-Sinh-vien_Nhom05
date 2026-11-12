const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = { sinhVien: { findMany: async () => [], findUnique: async () => null } };
require('../src/config/prisma');
require.cache[require.resolve('../src/config/prisma')].exports = prisma;
const controller = require('../src/controllers/studentController');

const response = () => ({ status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const day = 24 * 60 * 60 * 1000;
const room = (maPhong, maToaNha) => ({ maPhong, soPhong: maPhong, maToaNha });
const student = (assignments, contracts = []) => ({
    maSV: 'SV1', dienUuTien: null, hopDongs: contracts, dangKyKTXs: [], militaryRoomAssignments: assignments
});
const assignment = (start, end, phong, status = 'ACTIVE') => ({
    id: `${phong.maPhong}-${start}`, status, startsAt: new Date(start), endsAt: new Date(end), phong
});

test('student list and detail prefer the current military room, then restore the regular room after the stay', async (t) => {
    const now = Date.now();
    const military = room('QS103', 'A1');
    const regular = room('B201', 'B');
    const contract = { trangThai: 'ACTIVE', phong: regular };
    const active = assignment(now - day, now + day, military);
    const future = assignment(now + 2 * day, now + 12 * day, room('QS104', 'A1'));
    let data = student([active, future], [contract]);
    t.mock.method(prisma.sinhVien, 'findMany', async ({ include }) => {
        assert.equal(include.militaryRoomAssignments.where.status, 'ACTIVE');
        assert.ok(include.militaryRoomAssignments.where.endsAt.gt instanceof Date);
        return [data];
    });
    t.mock.method(prisma.sinhVien, 'findUnique', async () => data);

    for (const [handler, request] of [[controller.getAllStudents, { buildingScope: null }], [controller.getStudentById, { buildingScope: null, params: { id: 'SV1' } }]]) {
        const res = response();
        await handler(request, res);
        assert.equal(res.statusCode, 200);
        const record = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
        assert.equal(record.phongHienTai.maPhong, 'QS103');
        assert.equal(record.phongHienTai.source, 'MILITARY');
        assert.equal(record.trangThaiNoiTru, 'DANG_O');
        assert.equal(record.phongQuanSuSapToi.maPhong, 'QS104');
        assert.equal(record.hopDongs[0].phong.maPhong, 'B201');
    }

    data = student([future], [contract]);
    const after = response();
    await controller.getStudentById({ buildingScope: null, params: { id: 'SV1' } }, after);
    assert.equal(after.body.data.phongHienTai.maPhong, 'B201');
    assert.equal(after.body.data.phongHienTai.source, 'CONTRACT');
    assert.equal(after.body.data.phongQuanSuSapToi.maPhong, 'QS104');
});

test('upcoming military room does not mark an uncontracted student as currently resident', async (t) => {
    const now = Date.now();
    t.mock.method(prisma.sinhVien, 'findUnique', async () => student([assignment(now + day, now + 11 * day, room('QS103', 'A1'))]));
    const res = response();
    await controller.getStudentById({ buildingScope: null, params: { id: 'SV1' } }, res);
    assert.equal(res.body.data.phongHienTai, null);
    assert.equal(res.body.data.phongQuanSuSapToi.maPhong, 'QS103');
    assert.equal(res.body.data.trangThaiNoiTru, 'CHUA_DANG_KY');
});

test('scoped list includes current military residents and limits loaded rooms to assigned buildings', async (t) => {
    t.mock.method(prisma.sinhVien, 'findMany', async ({ where, include }) => {
        const military = where.OR.find((part) => part.militaryRoomAssignments).militaryRoomAssignments.some;
        assert.deepEqual(military.phong.is.maToaNha.in, ['A1']);
        assert.equal(military.status, 'ACTIVE');
        assert.ok(military.startsAt.lte instanceof Date);
        assert.ok(military.endsAt.gt instanceof Date);
        assert.deepEqual(include.militaryRoomAssignments.where.phong.is.maToaNha.in, ['A1']);
        assert.deepEqual(include.hopDongs.where.phong.is.maToaNha.in, ['A1']);
        return [student([assignment(Date.now() - day, Date.now() + day, room('QS103', 'A1'))])];
    });
    const res = response();
    await controller.getAllStudents({ buildingScope: ['A1'] }, res);
    assert.equal(res.body.data[0].phongHienTai.maPhong, 'QS103');
    assert.equal(res.body.data[0].trangThaiNoiTru, 'DANG_O');
});
