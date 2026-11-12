const test = require('node:test');
const assert = require('node:assert/strict');
const { createGenerateMonthlyInvoices } = require('../src/controllers/paymentController');

const response = () => ({ statusCode: 200, status(value) { this.statusCode = value; return this; }, json(body) { this.body = body; return this; } });

test('lập lại hóa đơn tháng giữ khoản đền bù, không tạo trùng và không sửa hóa đơn đã thu', async () => {
    const room = { soPhong: '101', utilityMeterReadings: [
        { utilityType: 'ELECTRICITY', previousReading: 100, currentReading: 105 },
        { utilityType: 'WATER', previousReading: 10, currentReading: 13 }
    ] };
    const contracts = [
        { maHopDong: 'C1', maSinhVien: 'S1', maPhong: 'P1', phong: room },
        { maHopDong: 'C2', maSinhVien: 'S2', maPhong: 'P1', phong: room },
        { maHopDong: 'C3', maSinhVien: 'S3', maPhong: 'P2', phong: { soPhong: '102', utilityMeterReadings: [] } }
    ];
    const invoices = new Map([
        ['C1', { id: 'I1', status: 'UNPAID', totalAmount: 50 }],
        ['C2', { id: 'I2', status: 'PAID', totalAmount: 123 }]
    ]);
    let items = [{ invoiceId: 'I1', type: 'DAMAGE_COMPENSATION', amount: 50 }];
    const tx = {
        monthlyInvoice: {
            upsert: async ({ where }) => invoices.get(where.maHopDong_periodStart.maHopDong),
            update: async ({ where, data }) => Object.assign([...invoices.values()].find((invoice) => invoice.id === where.id), data)
        },
        monthlyInvoiceItem: {
            deleteMany: async ({ where }) => { items = items.filter((item) => item.invoiceId !== where.invoiceId || !where.type.in.includes(item.type)); },
            aggregate: async ({ where }) => ({ _sum: { amount: items.filter((item) => item.invoiceId === where.invoiceId).reduce((sum, item) => sum + item.amount, 0) } }),
            createMany: async ({ data }) => { items.push(...data); }
        }
    };
    const optionsSeen = [];
    const db = { hopDong: { findMany: async () => contracts }, $transaction: async (fn, options) => { optionsSeen.push(options); return fn(tx); } };
    const handler = createGenerateMonthlyInvoices({ db, now: () => new Date('2026-10-31T00:00:00Z') });
    const request = { body: { period: '2026-10', electricityRate: 3000, waterRate: 12000 }, buildingScope: null, user: { id: 'staff' } };
    for (let run = 0; run < 2; run += 1) {
        const res = response();
        await handler(request, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.generated, 1);
        assert.equal(res.body.skippedClosedInvoices, 1);
        assert.equal(res.body.skippedMissingReadings, 1);
        assert.equal(invoices.get('C1').totalAmount, 25550);
        assert.equal(invoices.get('C2').totalAmount, 123);
        assert.equal(items.length, 3);
    }
    assert.ok(optionsSeen.every((options) => options.timeout === 30000 && options.maxWait === 10000));
});

test('khi một phòng lỗi, đợi các giao dịch đang chạy kết thúc trước khi báo số hóa đơn đã lưu', async () => {
    const readings = [{ utilityType: 'ELECTRICITY', previousReading: 0, currentReading: 1 }, { utilityType: 'WATER', previousReading: 0, currentReading: 1 }];
    const contracts = Array.from({ length: 4 }, (_, index) => ({ maHopDong: `C${index}`, maSinhVien: `S${index}`, maPhong: `P${index}`, phong: { soPhong: `${index}`, utilityMeterReadings: readings } }));
    let active = 0, peak = 0, started = 0;
    const tx = {
        monthlyInvoice: { upsert: async () => ({ id: 'invoice', status: 'UNPAID' }), update: async () => {} },
        monthlyInvoiceItem: { deleteMany: async () => {}, aggregate: async () => ({ _sum: { amount: 0 } }), createMany: async () => {} }
    };
    const db = {
        hopDong: { findMany: async () => contracts },
        $transaction: async (fn) => {
            const index = started++;
            active += 1; peak = Math.max(peak, active);
            await new Promise((resolve) => setTimeout(resolve, index === 0 ? 5 : 20));
            try { if (index === 0) throw new Error('database error'); return await fn(tx); }
            finally { active -= 1; }
        }
    };
    const handler = createGenerateMonthlyInvoices({ db, now: () => new Date('2026-10-31T00:00:00Z') });
    const res = response();
    const originalError = console.error;
    try {
        console.error = () => {};
        await handler({ body: { period: '2026-10', electricityRate: 3000, waterRate: 12000 }, user: { id: 'staff' } }, res);
    } finally { console.error = originalError; }
    assert.equal(res.statusCode, 500);
    assert.equal(peak, 3);
    assert.equal(started, 3);
    assert.equal(active, 0);
    assert.equal(res.body.generated, 2);
});

test('thử lại giao dịch bị xung đột tuần tự hóa trước khi báo lỗi', async () => {
    const room = { soPhong: '101', utilityMeterReadings: [
        { utilityType: 'ELECTRICITY', previousReading: 0, currentReading: 1 },
        { utilityType: 'WATER', previousReading: 0, currentReading: 1 }
    ] };
    const tx = {
        monthlyInvoice: { upsert: async () => ({ id: 'invoice', status: 'UNPAID' }), update: async () => {} },
        monthlyInvoiceItem: { deleteMany: async () => {}, aggregate: async () => ({ _sum: { amount: 0 } }), createMany: async () => {} }
    };
    let attempts = 0;
    const db = { hopDong: { findMany: async () => [{ maHopDong: 'C1', maSinhVien: 'S1', maPhong: 'P1', phong: room }] },
        $transaction: async (fn) => { if (++attempts === 1) throw Object.assign(new Error('conflict'), { code: 'P2034' }); return fn(tx); } };
    const res = response();
    await createGenerateMonthlyInvoices({ db, now: () => new Date('2026-10-31T00:00:00Z') })({ body: { period: '2026-10', electricityRate: 3000, waterRate: 12000 }, user: { id: 'staff' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.generated, 1);
    assert.equal(attempts, 2);
});
