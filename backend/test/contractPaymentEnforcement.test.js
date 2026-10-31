const test = require('node:test');
const assert = require('node:assert/strict');

const db = {};
require('../src/config/prisma');
require.cache[require.resolve('../src/config/prisma')].exports = db;
require('../src/utils/vnpay');
require.cache[require.resolve('../src/utils/vnpay')].exports = { verifyCallback: () => true, buildPaymentUrl: () => 'https://example.test/' };
const payments = require('../src/controllers/paymentController');
const bankWebhook = require('../src/controllers/webhookController');
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('VNPAY checkout rejects a contract at or beyond its stored deadline', async () => {
    db.hopDong = { findFirst: async () => ({ maHopDong: 'HD1', maSinhVien: 'SV1', tongTien: 100000, trangThai: 'PENDING_PAYMENT', paymentDueAt: new Date(Date.now() - 1) }) };
    const res = response();
    await payments.createVnpayPayment({ user: { role: 'STUDENT', maSV: 'SV1' }, body: { invoiceType: 'CONTRACT', invoiceId: 'HD1' } }, res);
    assert.equal(res.statusCode, 409);
});

test('a successful late VNPAY callback is retained for review without activating the contract', async (t) => {
    const previous = process.env.VNPAY_TMN_CODE;
    process.env.VNPAY_TMN_CODE = 'TEST';
    t.after(() => { if (previous === undefined) delete process.env.VNPAY_TMN_CODE; else process.env.VNPAY_TMN_CODE = previous; });
    const payment = { id: 'P1', txnRef: 'REF', invoiceType: 'CONTRACT', invoiceId: 'HD1', maSinhVien: 'SV1', amount: 100000, status: 'PENDING' };
    const events = [];
    db.vnpayPayment = { findUnique: async () => payment };
    db.$transaction = async (fn) => fn({
        vnpayPayment: { updateMany: async () => ({ count: 1 }), update: async ({ data }) => { events.push(['payment', data.status]); } },
        hopDong: { findFirst: async () => ({ maHopDong: 'HD1', maSinhVien: 'SV1', maPhong: 'A1', tongTien: 100000, trangThai: 'CANCELLED', paymentDueAt: new Date('2026-10-31T08:30:00+07:00') }), updateMany: async () => { events.push(['activate']); return { count: 1 }; } },
        phong: { findUnique: async () => ({ maToaNha: 'A' }) },
        financialTransaction: { create: async ({ data }) => { events.push(['ledger', data.status, data.paymentReference]); } },
        hoaDon: { create: async () => { events.push(['receipt']); } }
    });
    const res = response();
    await payments.handleVnpayIpn({ query: { vnp_TmnCode: 'TEST', vnp_TxnRef: 'REF', vnp_Amount: '10000000', vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_PayDate: '20261031090000' } }, res);
    assert.equal(res.body.RspCode, '00');
    assert.deepEqual(events, [['payment', 'NEEDS_REVIEW'], ['ledger', 'NEEDS_REVIEW', 'REF']]);
});

test('a VNPAY payment completed before the deadline activates the pending contract', async (t) => {
    const previous = process.env.VNPAY_TMN_CODE;
    process.env.VNPAY_TMN_CODE = 'TEST';
    t.after(() => { if (previous === undefined) delete process.env.VNPAY_TMN_CODE; else process.env.VNPAY_TMN_CODE = previous; });
    const events = [];
    db.vnpayPayment = { findUnique: async () => ({ id: 'P1', txnRef: 'REF2', invoiceType: 'CONTRACT', invoiceId: 'HD1', maSinhVien: 'SV1', amount: 100000, status: 'PENDING' }) };
    db.$transaction = async (fn) => fn({
        vnpayPayment: { updateMany: async () => ({ count: 1 }) },
        hopDong: { findFirst: async () => ({ maHopDong: 'HD1', maSinhVien: 'SV1', maPhong: 'A1', tongTien: 100000, trangThai: 'PENDING_PAYMENT', paymentDueAt: new Date('2026-10-31T09:30:00+07:00') }), updateMany: async () => { events.push('activated'); return { count: 1 }; } },
        phong: { findUnique: async () => ({ maToaNha: 'A' }) },
        financialTransaction: { count: async () => 0, create: async ({ data }) => { events.push(data.status); } },
        hoaDon: { create: async () => { events.push('receipt'); } }
    });
    const res = response();
    await payments.handleVnpayIpn({ query: { vnp_TmnCode: 'TEST', vnp_TxnRef: 'REF2', vnp_Amount: '10000000', vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_PayDate: '20261031090000' } }, res);
    assert.equal(res.body.RspCode, '00');
    assert.deepEqual(events, ['activated', 'receipt', 'CONFIRMED']);
});

test('a late bank transfer is recorded for review with an idempotent provider reference', async (t) => {
    const previous = process.env.WEBHOOK_SECRET;
    process.env.WEBHOOK_SECRET = 'test-secret';
    t.after(() => { if (previous === undefined) delete process.env.WEBHOOK_SECRET; else process.env.WEBHOOK_SECRET = previous; });
    const events = [];
    db.hopDong = { findMany: async () => [{ maHopDong: 'HD1', maSinhVien: 'SV1', tongTien: 100000, trangThai: 'CANCELLED', paymentDueAt: new Date('2026-10-31T08:30:00+07:00'), phong: { maToaNha: 'A' } }] };
    db.financialTransaction = { upsert: async (args) => { events.push(args); } };
    const req = { headers: { 'x-api-key': 'test-secret' }, body: { amount: 100000, description: 'Tien phong SV1', transactionId: 'BANK-123' } };
    const first = response();
    const second = response();
    await bankWebhook.handleBankTransfer(req, first);
    await bankWebhook.handleBankTransfer(req, second);
    assert.equal(first.body.needsReview, true);
    assert.equal(events[0].create.status, 'NEEDS_REVIEW');
    assert.equal(events[0].where.paymentReference, events[1].where.paymentReference);
    assert.deepEqual(events[0].update, {});
});
