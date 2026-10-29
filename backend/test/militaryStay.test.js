const test = require('node:test');
const assert = require('node:assert/strict');
const { MILITARY_STAY_MS, militaryStayState, resolveMilitaryStayPeriod } = require('../src/services/militaryStay');
const { serializeUser } = require('../src/controllers/authController');
const { getRoomOccupancy } = require('../src/services/roomOccupancy');
const { endExpiredMilitaryStays } = require('../src/services/militaryStayLifecycle');
const { assignMilitaryStudentsToA1 } = require('../src/services/militaryRoomAssignmentService');
const { createTicketController } = require('../src/controllers/ticketController');

const start = new Date('2026-11-01T00:00:00+07:00');
const end = new Date(start.getTime() + MILITARY_STAY_MS);
const stay = (overrides = {}) => ({ id: 'QS1', maSinhVien: 'SV1', maPhong: 'QS101', status: 'ACTIVE', startsAt: start, endsAt: end, assignedAt: start, ...overrides });
const regular = { maHopDong: 'HD1', maSinhVien: 'SV1', maPhong: 'B201', trangThai: 'ACTIVE', ngayBatDau: new Date('2026-09-01'), ngayKetThuc: new Date('2027-02-01'), tongTien: 1500000, phong: { maPhong: 'B201', soPhong: '201', maToaNha: 'B1', phiNoiTruThang: 300000 } };
const account = (assignment = stay(), contracts = [regular]) => ({
    id: 'user1', username: 'SV1', role: 'STUDENT',
    sinhVien: { maSV: 'SV1', hoTen: 'Student 1', laHocVienQuanSu: true, hopDongs: contracts, militaryRoomAssignments: [{ ...assignment, phong: { maPhong: 'QS101', soPhong: '101', maToaNha: 'A1', phiNoiTruThang: 400000 } }] }
});

test('GDQP is exactly 14 days in Vietnam, with an exclusive end and validated start date', () => {
    const period = resolveMilitaryStayPeriod({ startsAt: '2026-11-01', batchCode: 'DOT-1' }, new Date('2026-10-29'));
    assert.equal(period.startsAt.toISOString(), start.toISOString());
    assert.equal(period.endsAt.getTime() - period.startsAt.getTime(), MILITARY_STAY_MS);
    assert.equal(militaryStayState(stay(), new Date(start.getTime() - 1)), 'UPCOMING');
    assert.equal(militaryStayState(stay(), start), 'ACTIVE');
    assert.equal(militaryStayState(stay(), new Date(end.getTime() - 1)), 'ACTIVE');
    assert.equal(militaryStayState(stay(), end), 'ENDED');
    assert.throws(() => resolveMilitaryStayPeriod({ startsAt: 'invalid' }), { status: 400 });
    assert.throws(() => resolveMilitaryStayPeriod({ startsAt: '2027-02-30' }), { status: 400 });
    assert.throws(() => resolveMilitaryStayPeriod({ startsAt: '2020-01-01' }), { status: 400 });
});

test('before, during and after GDQP, the same account keeps its regular contract and billing', () => {
    const fixture = account();
    const snapshot = structuredClone(fixture);
    for (const [now, room, state] of [[new Date(start.getTime() - 1), 'B201', 'UPCOMING'], [start, 'QS101', 'ACTIVE'], [end, 'B201', 'ENDED']]) {
        const user = serializeUser(fixture, now);
        assert.equal(user.role, 'STUDENT');
        assert.equal(user.currentResidence.maPhong, room);
        assert.equal(user.currentContract.maHopDong, 'HD1');
        assert.equal(user.currentContract.maPhong, 'B201');
        assert.equal(user.currentContract.tongTien, 1500000);
        assert.equal(user.ngayKetThucHopDong, regular.ngayKetThuc);
        assert.equal(user.militaryStay.state, state);
        assert.equal(user.militaryStay.tongTien, null);
        assert.equal(user.militaryStay.phiNoiTruThang, null);
    }
    assert.deepEqual(fixture, snapshot);
});

test('military-only students return to no room and no contract when the study period ends', () => {
    const fixture = { ...account(stay(), []), role: 'MILITARY_STUDENT' };
    assert.equal(serializeUser(fixture, start).currentResidence.source, 'MILITARY');
    const after = serializeUser(fixture, end);
    assert.equal(after.currentContract, null);
    assert.equal(after.currentResidence, null);
    assert.equal(after.trangThaiNoiTru, 'CHUA_DANG_KY');
    assert.equal(serializeUser(account(stay({ status: 'ENDED', endedAt: start })), start).currentResidence.source, 'CONTRACT');
});

test('regular places stay reserved during GDQP while expired military places become available immediately', () => {
    const room = { maPhong: 'B201', soSinhVienToiDa: 1, hopDongs: [{ ...regular, sinhVien: { militaryRoomAssignments: [stay()] } }] };
    const during = getRoomOccupancy(room, start);
    assert.equal(during.soSinhVienHienTai, 1);
    assert.equal(during.choConTrong, 0);
    assert.equal(during.soSinhVienDangO, 0);
    assert.equal(during.soChoBaoLuuGDQP, 1);
    assert.equal(during.thanhVien[0].trangThaiNoiTru, 'TAM_VANG_GDQP');
    assert.equal(getRoomOccupancy(room, end).soSinhVienDangO, 1);
    assert.equal(getRoomOccupancy({ soSinhVienToiDa: 1, militaryRoomAssignments: [stay()] }, end).choConTrong, 1);
});

test('expiry releases only military places, is idempotent, and never updates a regular contract', async () => {
    let status = 'ACTIVE';
    let counter = 1;
    const tx = {
        militaryRoomAssignment: {
            findMany: async () => status === 'ACTIVE' ? [stay()] : [],
            updateMany: async ({ data }) => { status = data.status; assert.equal(data.endedAt, end); return { count: 1 }; }
        },
        phong: {
            findMany: async () => [{ maPhong: 'QS101', soSinhVienToiDa: 1, militaryRoomAssignments: [stay({ status })] }],
            update: async ({ where, data }) => { assert.equal(where.maPhong, 'QS101'); counter = data.soSinhVienHienTai; }
        },
        hopDong: new Proxy({}, { get() { assert.fail('GDQP must never write the regular contract'); } })
    };
    assert.equal(await endExpiredMilitaryStays(tx, end), 1);
    assert.equal(counter, 0);
    assert.equal(await endExpiredMilitaryStays(tx, end), 0);
});

test('SIS reruns cannot reassign a completed student; officers may explicitly select a later study period', async () => {
    const created = [];
    const room = { maPhong: 'QS101', maToaNha: 'A1', soPhong: '101', tang: 1, soSinhVienToiDa: 4, soSinhVienHienTai: 0, hopDongs: [], militaryRoomAssignments: [] };
    const tx = {
        sinhVien: { findMany: async () => [{ maSV: 'SV1', gioiTinh: true, militaryRoomAssignments: [stay({ status: 'ENDED' })] }] },
        militaryRoomAssignment: { findMany: async () => [], create: async ({ data }) => { created.push(data); return data; } },
        phong: { findMany: async () => [room], updateMany: async () => ({ count: 1 }) }
    };
    const db = { $transaction: async (operation) => operation(tx) };
    const now = new Date('2026-12-01T00:00:00+07:00');
    const result = await assignMilitaryStudentsToA1({ db, assignedById: 'officer', now });
    assert.equal(result.assigned, 0);
    assert.equal(result.completedCount, 1);
    const next = await assignMilitaryStudentsToA1({ db, assignedById: 'officer', now, startsAt: '2026-12-01', batchCode: 'DOT-2' });
    assert.equal(next.assigned, 1);
    assert.equal(created[0].batchCode, 'DOT-2');
    assert.equal(created[0].endsAt - created[0].startsAt, MILITARY_STAY_MS);
});

test('repair reports use the current military room and return to the original room after GDQP', async () => {
    for (const [now, military, expectedRoom] of [[start, stay({ phong: { maPhong: 'QS101' } }), 'QS101'], [end, null, 'B201']]) {
        let written;
        const db = {
            militaryRoomAssignment: { findFirst: async ({ where }) => { assert.equal(where.maSinhVien, 'SV1'); assert.equal(where.endsAt.gt, now); return military; } },
            hopDong: { findFirst: async () => regular },
            maintenanceTicket: { create: async ({ data }) => { written = data; return { id: 'ticket', ...data }; } }
        };
        const controller = createTicketController({ db, now: () => now });
        const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
        await controller.create({ user: { id: 'user1', maSV: 'SV1', role: 'STUDENT' }, body: { category: 'dien', title: 'Hỏng đèn', description: 'Đèn trần không sáng', photos: [{ fileName: 'den.png', mimeType: 'image/png', data: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64') }] } }, res);
        assert.equal(res.statusCode, 201);
        assert.equal(written.maPhong, expectedRoom);
    }
});

test('military equipment lookup always uses the authenticated profile, never a supplied student identifier', async () => {
    const { createMilitaryStayController } = require('../src/controllers/studentSelfServiceController');
    const db = { sinhVien: { findFirst: async ({ where }) => {
        assert.equal(where.userId, 'user1');
        return { maSV: 'SV1' };
    } }, militaryEquipmentIssue: { findMany: async ({ where, select }) => {
        assert.deepEqual(where, { maSinhVien: 'SV1' });
        assert.equal(select.item.select.name, true);
        return [{ id: 'own-issue', quantity: 2, returnedQuantity: 1 }];
    } } };
    const res = { json(body) { this.body = body; return this; }, status(code) { this.statusCode = code; return this; } };
    await createMilitaryStayController({ db })({ user: { id: 'user1' }, query: { maSinhVien: 'ANOTHER-STUDENT' } }, res);
    assert.equal(res.body.issues[0].id, 'own-issue');
});
