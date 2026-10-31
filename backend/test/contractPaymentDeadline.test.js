const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateContractDueAt, getContractInvoiceDueAt } = require('../src/services/invoiceDueDates');
const { expireContracts } = require('../src/services/contractExpiration');

test('auto approval gives exactly thirty minutes and ordinary approval adds three Vietnam business days', () => {
    const friday = new Date('2026-10-30T09:30:00+07:00');
    assert.equal(calculateContractDueAt(friday, true).toISOString(), '2026-10-30T03:00:00.000Z');
    assert.equal(calculateContractDueAt(friday).toISOString(), '2026-11-04T02:30:00.000Z');
    assert.equal(calculateContractDueAt(friday, false, ['2026-11-02']).toISOString(), '2026-11-05T02:30:00.000Z');
    const saturday = new Date('2026-10-31T23:30:00+07:00');
    assert.equal(calculateContractDueAt(saturday).toISOString(), '2026-11-04T16:30:00.000Z');
});

test('stored deadline is stable and older contracts keep the 48-hour deadline', () => {
    const old = new Date('2026-10-30T12:00:00Z');
    assert.equal(getContractInvoiceDueAt({ ngayTao: old }).toISOString(), '2026-11-01T12:00:00.000Z');
    assert.equal(getContractInvoiceDueAt({ ngayTao: old, paymentDueAt: '2026-10-30T12:30:00Z' }).toISOString(), '2026-10-30T12:30:00.000Z');
});

test('expiry only releases a place after an atomic cancellation and cannot cancel a paid contract', async () => {
    const now = new Date('2026-10-30T13:00:00Z');
    const calls = [];
    const db = {
        hopDong: { findMany: async ({ where }) => { assert.deepEqual(where.paymentDueAt, { lte: now }); return [{ maHopDong: 'expired', maPhong: 'A' }, { maHopDong: 'paid', maPhong: 'B' }]; } },
        $transaction: async (fn) => fn({
            hopDong: { updateMany: async ({ where }) => { assert.equal(where.trangThai, 'PENDING_PAYMENT'); return { count: where.maHopDong === 'expired' ? 1 : 0 }; } },
            phong: { updateMany: async ({ where }) => { calls.push(where.maPhong); return { count: 1 }; } }
        })
    };
    assert.equal(await expireContracts(db, now), 1);
    assert.deepEqual(calls, ['A']);
});
