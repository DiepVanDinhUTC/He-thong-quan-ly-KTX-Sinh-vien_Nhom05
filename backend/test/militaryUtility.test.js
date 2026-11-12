const test = require('node:test');
const assert = require('node:assert/strict');
const { groupMilitaryPeriods, splitAmount } = require('../src/services/militaryUtility');
const { getMonthlyInvoiceDueAt } = require('../src/services/invoiceDueDates');
const { createGenerateMilitaryInvoices } = require('../src/controllers/militaryBillingController');

const startsAt = new Date('2026-10-27T17:00:00Z');
const endsAt = new Date('2026-11-06T17:00:00Z');
const assignment = (id, maSinhVien, maPhong = 'P1', extra = {}) => ({ id, maSinhVien, maPhong, status: 'ACTIVE', startsAt, endsAt, ...extra });

test('chia tổng tiền nguyên đồng đều và không thất thoát phần dư', () => {
    const shares = Array.from({ length: 4 }, (_, index) => splitAmount(10, 4, index));
    assert.deepEqual(shares, [3, 3, 2, 2]);
    assert.equal(shares.reduce((a, b) => a + b, 0), 10);
});

test('gom học viên theo phòng và đợt 10 ngày kể cả qua tháng, giữ lịch sử 14 ngày ngoài phạm vi', () => {
    const groups = groupMilitaryPeriods([assignment('1', 'SV1'), assignment('2', 'SV2'), assignment('3', 'SV3', 'P2'), assignment('4', 'SV4', 'P3', { endsAt: new Date(+startsAt + 14 * 86400000) })]);
    assert.equal(groups.length, 2);
    assert.equal(groups.find((group) => group.maPhong === 'P1').assignments.length, 2);
    assert.equal(groups[0].ambiguous, false);
});

test('không tự chia đợt chuyển phòng, kết thúc sớm hoặc chồng lấn', () => {
    const early = assignment('1', 'SV1', 'P1', { status: 'ENDED', endedAt: new Date(+startsAt + 86400000) });
    const transferred = assignment('2', 'SV1', 'P2');
    const groups = groupMilitaryPeriods([early, transferred]);
    assert.ok(groups.every((group) => group.ambiguous));
    const overlap = assignment('3', 'SV2', 'P1', { startsAt: new Date(+startsAt + 86400000), endsAt: new Date(+endsAt + 86400000) });
    assert.ok(groupMilitaryPeriods([assignment('4', 'SV3'), overlap]).every((group) => group.ambiguous));
    const oldStay = assignment('5', 'SV4', 'P1', { endsAt: new Date(+startsAt + 14 * 86400000) });
    assert.equal(groupMilitaryPeriods([assignment('4', 'SV3'), oldStay])[0].ambiguous, true);
});

test('hóa đơn GDQP xuyên tháng đến hạn theo tháng phát hành', () => {
    assert.equal(getMonthlyInvoiceDueAt({ militaryUtilityPeriodId: 'period', periodStart: new Date('2026-10-01'), createdAt: new Date('2026-11-07T00:00:00Z') }).toISOString(), '2026-11-30T17:00:00.000Z');
});

test('lập hóa đơn theo chỉ số đợt cho từng học viên và không lập trùng khi chạy lại', async () => {
    const assignments = ['SV3', 'SV1', 'SV2'].map((id) => ({ ...assignment(id, id), phong: { soPhong: '101', maToaNha: 'A1' } }));
    const reading = { id: 'period1', electricityStart: 100, electricityEnd: 110, waterStart: 20, waterEnd: 22 };
    const invoices = [], items = [];
    const tx = {
        militaryRoomAssignment: { findMany: async () => assignments },
        militaryUtilityPeriod: { findUnique: async () => ({ ...reading, invoices }) },
        monthlyInvoice: {
            upsert: async ({ create }) => { const invoice = { ...create, id: `invoice-${create.maSinhVien}`, status: 'UNPAID' }; invoices.push(invoice); return invoice; },
            update: async ({ where, data }) => Object.assign(invoices.find((invoice) => invoice.id === where.id), data)
        },
        monthlyInvoiceItem: {
            deleteMany: async () => {},
            aggregate: async () => ({ _sum: { amount: null } }),
            createMany: async ({ data }) => items.push(...data)
        }
    };
    const db = { ...tx, $transaction: async (operation) => operation(tx) };
    const generate = createGenerateMilitaryInvoices({ db, now: () => new Date('2026-11-08T00:00:00Z') });
    const req = { body: { period: '2026-10', electricityRate: 3000, waterRate: 12000 }, buildingScope: ['A1'], user: { id: 'staff' } };
    const response = () => ({ statusCode: 200, status(value) { this.statusCode = value; return this; }, json(body) { this.body = body; return this; } });
    const first = response();
    await generate(req, first);
    assert.equal(first.body.generated, 3);
    assert.equal(items.length, 6);
    assert.deepEqual(invoices.map((invoice) => invoice.totalAmount), [18000, 18000, 18000]);
    assert.equal(invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0), 10 * 3000 + 2 * 12000);
    const second = response();
    await generate(req, second);
    assert.equal(second.body.generated, 0);
    assert.equal(second.body.skipped, 1);
    assert.equal(invoices.length, 3);
});
