const test = require('node:test');
const assert = require('node:assert/strict');
const { createStudentHousingRequestController } = require('../src/controllers/studentSelfServiceController');

const run = async (checkedInAt, requestedAt, previousRefund = 0) => {
    const state = { contract: { maHopDong: 'HD1', maPhong: 'P1', trangThai: 'ACTIVE', checkedInAt, phong: { maToaNha: 'A' } }, requests: [], refunds: [], releases: 0 };
    const db = {
        sinhVien: { findFirst: async () => ({ maSV: 'SV1' }) },
        hopDong: { findFirst: async () => state.contract, updateMany: async () => { state.contract.trangThai = 'CANCELLED'; return { count: 1 }; } },
        studentHousingRequest: { findFirst: async () => null, create: async ({ data }) => { state.requests.push(data); return data; } },
        hoaDon: { aggregate: async () => ({ _sum: { soTien: 1000000 } }) },
        financialTransaction: { aggregate: async () => ({ _sum: { amount: previousRefund } }), create: async ({ data }) => state.refunds.push(data) },
        phong: { updateMany: async () => { state.releases++; } },
        studentServiceRegistration: { updateMany: async () => {} },
        $transaction: async (fn) => fn(db)
    };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await createStudentHousingRequestController({ db, now: () => requestedAt })({ user: { id: 'user' }, body: { requestType: 'RETURN' } }, res);
    return { state, res };
};

test('exactly seven days cancels once and reserves remaining refund for finance', async () => {
    const { state, res } = await run(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-08T00:00:00Z'), 200000);
    assert.equal(res.statusCode, 201);
    assert.equal(state.contract.trangThai, 'CANCELLED');
    assert.equal(state.releases, 1);
    assert.equal(state.requests[0].status, 'APPROVED');
    assert.equal(state.refunds[0].amount, 800000);
    assert.equal(state.refunds[0].status, 'NEEDS_REVIEW');
});

test('late, missing, or future check-in leaves a request for staff review', async () => {
    for (const checkin of [new Date('2026-01-01T00:00:00Z'), null, new Date('2026-01-09T00:00:00Z')]) {
        const { state, res } = await run(checkin, new Date('2026-01-08T00:00:00.001Z'));
        assert.equal(res.statusCode, 201);
        assert.equal(state.contract.trangThai, 'ACTIVE');
        assert.equal(state.refunds.length, 0);
        assert.equal(state.releases, 0);
        assert.equal(state.requests[0].status, undefined);
    }
});
