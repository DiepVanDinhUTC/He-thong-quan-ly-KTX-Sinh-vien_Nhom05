const test = require('node:test');
const assert = require('node:assert/strict');
const ROLES = require('../src/config/roles');
const router = require('../src/routes/api/v1/studentSelfService');
const { createHousingRequestController } = require('../src/controllers/studentSelfServiceController');

const response = () => ({
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});

const fixture = ({ requestType = 'TRANSFER', status = 'PENDING', full = false, sameRoom = false, missingTarget = false, contractStatus = 'ACTIVE', lostDecision = false, scope = [], targetMonthlyFee = 625000 } = {}) => {
    const source = { maPhong: 'A101', maToaNha: 'A1', soSinhVienHienTai: 3, soSinhVienToiDa: 4, phiNoiTruThang: 300000 };
    const target = { maPhong: 'B201', maToaNha: 'B2', soSinhVienHienTai: full ? 4 : 2, soSinhVienToiDa: 4, phiNoiTruThang: targetMonthlyFee };
    const state = {
        rooms: { A101: source, ...(missingTarget ? {} : { B201: target }) },
        contract: { maHopDong: 'HD1', maPhong: 'A101', trangThai: contractStatus, ngayBatDau: new Date('2026-01-01'), ngayKetThuc: new Date('2026-11-01'), tongTien: 3000000 },
        request: { id: 'REQ1', maSinhVien: 'SV1', maHopDong: 'HD1', maPhongMoi: sameRoom ? 'A101' : 'B201', requestType, status },
        servicesCancelled: false
    };
    const calls = { transactions: 0, scope: 0 };
    const contractWithRoom = () => ({ ...state.contract, phong: { ...state.rooms[state.contract.maPhong] } });
    const requestWithContract = () => ({ ...state.request, hopDong: contractWithRoom() });
    const db = {
        userBuildingAccess: { findMany: async () => { calls.scope += 1; return scope.map((maToaNha) => ({ maToaNha })); } },
        studentHousingRequest: {
            findMany: async (args) => { calls.list = args; return []; },
            findUnique: async () => requestWithContract(),
            updateMany: async ({ where, data }) => {
                if (lostDecision || state.request.status !== where.status) return { count: 0 };
                Object.assign(state.request, data);
                return { count: 1 };
            }
        },
        hopDong: {
            findUnique: async () => contractWithRoom(),
            update: async ({ data }) => { Object.assign(state.contract, data); return contractWithRoom(); }
        },
        phong: {
            findUnique: async ({ where }) => state.rooms[where.maPhong] || null,
            updateMany: async ({ where, data }) => {
                const room = state.rooms[where.maPhong];
                const count = where.soSinhVienHienTai;
                if (!room || (count.lt !== undefined && room.soSinhVienHienTai >= count.lt)
                    || (count.gt !== undefined && room.soSinhVienHienTai <= count.gt)) return { count: 0 };
                room.soSinhVienHienTai += (data.soSinhVienHienTai.increment || 0) - (data.soSinhVienHienTai.decrement || 0);
                return { count: 1 };
            }
        },
        studentServiceRegistration: { updateMany: async () => { state.servicesCancelled = true; return { count: 1 }; } },
        $transaction: async (callback, options) => {
            calls.transactions += 1;
            calls.transactionOptions = options;
            const snapshot = structuredClone(state);
            try { return await callback(db); }
            catch (error) { Object.assign(state, snapshot); throw error; }
        }
    };
    const controller = createHousingRequestController({ db });
    const decide = async (role = 'ARCHIVIST', body = { status: 'APPROVED' }) => {
        const res = response();
        await controller.decideHousingRequest({ user: { id: 'staff1', role }, params: { id: 'REQ1' }, body }, res);
        return res;
    };
    const list = async (role) => {
        const res = response();
        await controller.listHousingRequests({ user: { id: 'staff1', role } }, res);
        return res;
    };
    return { state, calls, decide, list };
};

test('housing API role gates and frontend actions agree for every role', async () => {
    const { housingRequestReadRoles, canDecideHousingRequest } = await import('../../frontend/src/utils/accessControl.js');
    assert.deepEqual(housingRequestReadRoles, ROLES.HOUSING_REQUEST_READ_ROLES);
    const readGate = router.stack.find((layer) => layer.route?.path === '/housing-requests' && layer.route.methods.get).route.stack[0].handle;
    const decideGate = router.stack.find((layer) => layer.route?.path === '/housing-requests/:id').route.stack[0].handle;
    for (const role of ROLES.KNOWN_ROLES) {
        for (const type of ['TRANSFER', 'RETURN']) {
            assert.equal(canDecideHousingRequest(role, type), ROLES.HOUSING_REQUEST_DECISION_ROLES[type].includes(role), `${role}: ${type}`);
        }
        for (const [gate, expected] of [
            [readGate, housingRequestReadRoles.includes(role)],
            [decideGate, ['ARCHIVIST', 'BUILDING_MANAGER', 'ADMIN'].includes(role)]
        ]) {
            let next = false;
            const res = response();
            await gate({ user: { role } }, res, () => { next = true; });
            assert.equal(next, expected, role);
            if (!expected) assert.equal(res.statusCode, 403);
        }
    }
});

test('a military learner can use their own housing-request and room-list endpoints, but cannot create a new dorm application', async () => {
    const applications = require('../src/routes/api/v1/applications');
    for (const [route, path, method, expected] of [
        [router, '/housing-requests/mine', 'get', true],
        [router, '/housing-requests', 'post', true],
        [applications, '/rooms', 'get', true],
        [applications, '/', 'post', false]
    ]) {
        const gate = route.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
        let allowed = false;
        const res = response();
        await gate({ user: { role: 'MILITARY_STUDENT', maSV: 'SV1' } }, res, () => { allowed = true; });
        assert.equal(allowed, expected, `${method} ${path}`);
        if (!expected) assert.equal(res.statusCode, 403);
    }
});

test('archivists list transfer requests across buildings without assignments', async () => {
    const f = fixture();
    assert.equal((await f.list('ARCHIVIST')).statusCode, 200);
    assert.deepEqual(f.calls.list.where, { requestType: 'TRANSFER' });
    assert.equal(f.calls.scope, 0);
});

test('building managers retain a building-scoped list; board readers retain global oversight', async () => {
    const f = fixture({ scope: ['A1'] });
    await f.list('BUILDING_MANAGER');
    assert.deepEqual(f.calls.list.where, { hopDong: { phong: { maToaNha: { in: ['A1'] } } } });
    for (const role of ['BOARD_CHAIR', 'BOARD_DEPUTY', 'ADMIN']) {
        await f.list(role);
        assert.deepEqual(f.calls.list.where, {});
    }
});

test('an archivist approves a transfer across buildings and updates occupancy and the existing contract', async () => {
    const f = fixture();
    const res = await f.decide('ARCHIVIST', { status: 'APPROVED', staffNote: '  Đồng ý chuyển phòng.  ' });
    assert.equal(res.statusCode, 200);
    assert.equal(f.state.request.status, 'APPROVED');
    assert.equal(f.state.request.staffNote, 'Đồng ý chuyển phòng.');
    assert.ok(f.state.request.decidedAt instanceof Date);
    assert.equal(f.state.contract.maHopDong, 'HD1');
    assert.equal(f.state.contract.maPhong, 'B201');
    assert.equal(f.state.contract.tongTien, 6250000);
    assert.equal(f.state.contract.trangThai, 'ACTIVE');
    assert.equal(f.state.rooms.A101.soSinhVienHienTai, 2);
    assert.equal(f.state.rooms.B201.soSinhVienHienTai, 3);
    assert.equal(f.calls.scope, 0);
    assert.deepEqual(f.calls.transactionOptions, { isolationLevel: 'Serializable' });
    assert.equal(res.body.request.hopDong.phong.maPhong, 'B201');
    assert.equal(res.body.request.hopDong.tongTien, 6250000);
    assert.equal(res.body.request.hopDong.phong.phiNoiTruThang, 625000);
});

test('approved transfers immediately use the latest destination rate for higher, lower, and unchanged prices', async () => {
    for (const role of ['ARCHIVIST', 'ADMIN']) {
        for (const monthlyFee of [850000, 150000, 300000, 0]) {
            const f = fixture();
            // The destination price can change while the request is pending.
            f.state.rooms.B201.phiNoiTruThang = monthlyFee;
            const res = await f.decide(role);
            assert.equal(res.statusCode, 200);
            assert.equal(f.state.contract.tongTien, monthlyFee * 10);
            assert.equal(res.body.request.hopDong.tongTien, monthlyFee * 10);
            assert.equal(f.state.contract.ngayBatDau.toISOString(), '2026-01-01T00:00:00.000Z');
            assert.equal(f.state.contract.ngayKetThuc.toISOString(), '2026-11-01T00:00:00.000Z');
        }
    }
});

test('a transfer within a semester recalculates the five-month fee using the new room rate', async () => {
    const f = fixture();
    f.state.contract.ngayKetThuc = new Date('2026-06-01');
    f.state.contract.tongTien = 1500000;
    const res = await f.decide();
    assert.equal(res.statusCode, 200);
    assert.equal(f.state.contract.tongTien, 3125000);
    assert.equal(res.body.request.hopDong.tongTien, 3125000);
});

test('invalid destination pricing rolls back approval without moving the student or changing rent', async () => {
    for (const targetMonthlyFee of [null, -1]) {
        const f = fixture({ targetMonthlyFee });
        const before = structuredClone(f.state);
        assert.equal((await f.decide()).statusCode, 409);
        assert.deepEqual(f.state, before);
    }
});

test('an archivist rejects a transfer with feedback without changing the room or occupancy', async () => {
    const f = fixture();
    const res = await f.decide('ARCHIVIST', { status: 'REJECTED', staffNote: 'Chưa đủ điều kiện.' });
    assert.equal(res.statusCode, 200);
    assert.equal(f.state.request.status, 'REJECTED');
    assert.equal(f.state.request.staffNote, 'Chưa đủ điều kiện.');
    assert.equal(f.state.contract.maPhong, 'A101');
    assert.equal(f.state.contract.tongTien, 3000000);
    assert.equal(f.state.rooms.A101.soSinhVienHienTai, 3);
    assert.equal(f.state.rooms.B201.soSinhVienHienTai, 2);
});

test('only archivists and ADMIN can approve or reject a transfer, including direct API calls', async () => {
    for (const role of ROLES.KNOWN_ROLES) {
        for (const status of ['APPROVED', 'REJECTED']) {
            const f = fixture({ scope: ['A1', 'B2'] });
            const res = await f.decide(role, { status });
            const allowed = ['ARCHIVIST', 'ADMIN'].includes(role);
            assert.equal(res.statusCode, allowed ? 200 : 403, `${role}: ${status}`);
            if (!allowed) {
                assert.equal(f.calls.transactions, 0);
                assert.equal(f.state.request.status, 'PENDING');
                assert.equal(f.state.contract.maPhong, 'A101');
            }
        }
    }
});

test('a full, missing, or already occupied target cannot change the request, contract, or room counts', async () => {
    for (const options of [{ full: true }, { missingTarget: true }, { sameRoom: true }]) {
        const f = fixture(options);
        const before = structuredClone(f.state);
        const res = await f.decide();
        assert.equal(res.statusCode, options.missingTarget ? 404 : 409);
        assert.deepEqual(f.state, before);
    }
});

test('already decided requests, expired contracts, and competing decisions cannot move a student twice', async () => {
    for (const options of [{ status: 'APPROVED' }, { contractStatus: 'RETURNED' }, { lostDecision: true }]) {
        const f = fixture(options);
        const before = structuredClone(f.state);
        assert.equal((await f.decide()).statusCode, 409);
        assert.deepEqual(f.state, before);
    }
    const f = fixture();
    await f.decide();
    const approved = structuredClone(f.state);
    assert.equal((await f.decide()).statusCode, 409);
    assert.deepEqual(f.state, approved);
});

test('housing decisions reject unsupported statuses and oversized notes before changing data', async () => {
    for (const body of [{ status: 'PENDING' }, { status: 'APPROVED', staffNote: 'x'.repeat(501) }]) {
        const f = fixture();
        assert.equal((await f.decide('ARCHIVIST', body)).statusCode, 400);
        assert.equal(f.calls.transactions, 0);
    }
});

test('return requests keep their existing building-manager workflow and scope', async () => {
    const f = fixture({ requestType: 'RETURN', scope: ['A1'] });
    assert.equal((await f.decide('ARCHIVIST')).statusCode, 403);
    assert.equal((await f.decide('BUILDING_MANAGER')).statusCode, 200);
    assert.equal(f.state.contract.trangThai, 'RETURNED');
    assert.equal(f.state.contract.tongTien, 3000000);
    assert.equal(f.state.rooms.A101.soSinhVienHienTai, 2);
    assert.equal(f.state.servicesCancelled, true);
    const outside = fixture({ requestType: 'RETURN', scope: ['B2'] });
    assert.equal((await outside.decide('BUILDING_MANAGER')).statusCode, 404);
    assert.equal(outside.calls.transactions, 0);
});
