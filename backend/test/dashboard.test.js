const test = require('node:test');
const assert = require('node:assert/strict');
const ROLES = require('../src/config/roles');
const { dashboardPeriod, buildDashboardStatistics } = require('../src/services/dashboardStatistics');
const { createDashboardController } = require('../src/controllers/dashboardController');
const dashboardRouter = require('../src/routes/api/v1/dashboard');

const now = new Date('2026-10-24T05:00:00Z');
const room = (buildingId) => ({ maToaNha: buildingId });
const contractLink = (buildingId) => ({ phong: room(buildingId) });
const transaction = (overrides) => ({ invoiceType: 'CONTRACT', transactionType: 'COLLECTION', status: 'CONFIRMED', maToaNha: 'A1', createdAt: new Date('2026-10-01T00:00:00Z'), ...overrides });
const ticket = (overrides) => ({ category: 'dien', status: 'COMPLETED', phong: room('A1'), createdAt: new Date('2026-10-01T00:00:00Z'), resolvedAt: new Date('2026-10-01T02:00:00Z'), ...overrides });
const roomContracts = (count, prefix) => Array.from({ length: count }, (_, index) => ({
    maHopDong: `${prefix}-HD${index}`, maSinhVien: `${prefix}-SV${index}`, trangThai: 'ACTIVE'
}));
const fixture = () => ({
    buildings: [{ maToaNha: 'A1', tenToaNha: 'Tòa A1' }, { maToaNha: 'B1', tenToaNha: 'Tòa B1' }],
    rooms: [
        { maToaNha: 'A1', soSinhVienToiDa: 4, soSinhVienHienTai: 3, hopDongs: roomContracts(3, 'A101') },
        { maToaNha: 'A1', soSinhVienToiDa: 8, soSinhVienHienTai: 4, hopDongs: roomContracts(4, 'A102') },
        { maToaNha: 'B1', soSinhVienToiDa: 4, soSinhVienHienTai: 4, militaryRoomAssignments: Array.from({ length: 4 }, (_, index) => ({ id: `QS${index}`, maSinhVien: `QS-SV${index}`, status: 'ACTIVE' })) }
    ],
    contracts: [
        { tongTien: 1000, ngayTao: '2026-10-20T00:00:00Z', phong: room('A1') },
        { tongTien: 2000, ngayTao: '2026-10-24T04:00:00Z', phong: room('B1') }
    ],
    monthlyInvoices: [
        { totalAmount: 100, periodStart: '2026-09-01', hopDong: contractLink('A1') },
        { totalAmount: 50, periodStart: '2026-10-01', hopDong: contractLink('A1') },
        { totalAmount: 300, periodStart: '2026-09-01', hopDong: contractLink('B1') },
        { totalAmount: 0, periodStart: '2026-09-01', hopDong: contractLink('A1') }
    ],
    transactions: [
        transaction({ invoiceId: 'HD1', amount: 1000 }),
        transaction({ invoiceId: 'M1', invoiceType: 'MONTHLY', amount: 200 }),
        transaction({ invoiceId: 'M1', invoiceType: 'MONTHLY', transactionType: 'REFUND', amount: 50 }),
        transaction({ invoiceId: 'HD2', amount: 600, status: 'NEEDS_REVIEW' }),
        transaction({ invoiceId: 'EXP', amount: 10000, transactionType: 'EXPENSE' }),
        transaction({ invoiceId: 'OTHER', maToaNha: 'B1', amount: 50000 })
    ],
    receipts: [
        { maHopDong: 'HD1', soTien: 1000, ngayThanhToan: '2026-10-01T00:00:00Z', hopDong: contractLink('A1') },
        { maHopDong: 'HD2', soTien: 600, ngayThanhToan: '2026-10-01T00:00:00Z', hopDong: contractLink('A1') },
        { maHopDong: 'LEGACY', soTien: 250, ngayThanhToan: '2026-10-01T00:00:00Z', hopDong: contractLink('A1') }
    ],
    tickets: [
        ticket({ completedAt: new Date('2026-10-03T00:00:00Z') }),
        ticket({ category: 'nuoc', status: 'WAITING_ACCEPTANCE', resolvedAt: new Date('2026-10-01T06:00:00Z') }),
        ticket({ category: 'dieu-hoa', status: 'IN_PROGRESS', resolvedAt: null }),
        ticket({ status: 'REJECTED' }),
        ticket({ phong: room('B1'), resolvedAt: new Date('2026-10-01T10:00:00Z') })
    ],
    period: dashboardPeriod(3, now)
});
const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});

test('dashboard month buckets use Vietnam time and include empty months across years', () => {
    const period = dashboardPeriod(3, new Date('2026-12-31T18:00:00Z'));
    assert.deepEqual(period.buckets.map(({ period }) => period), ['2026-11', '2026-12', '2027-01']);
    assert.equal(period.start.toISOString(), '2026-10-31T17:00:00.000Z');
    const stats = buildDashboardStatistics({ buildings: [], rooms: [], contracts: [], monthlyInvoices: [], tickets: [], receipts: [], transactions: [], period });
    assert.equal(stats.summary.occupancyRate, 0);
    assert.equal(stats.summary.netRevenue, 0);
    assert.equal(stats.summary.averageResolutionHours, null);
    assert.equal(stats.charts.revenue.length, 3);
    assert.deepEqual(stats.charts.resolution.map(({ averageHours }) => averageHours), [null, null, null]);
    assert.ok(!JSON.stringify(stats).includes('NaN'));
});

test('statistics use weighted occupancy, confirmed net receipts, full unpaid debt, and technical resolution times', () => {
    const stats = buildDashboardStatistics({ ...fixture(), buildingIds: ['A1'] });
    assert.equal(stats.summary.occupancyRate, 58.33);
    assert.equal(stats.summary.capacity, 12);
    assert.equal(stats.summary.occupied, 7);
    assert.equal(stats.summary.collected, 1450);
    assert.equal(stats.summary.refunds, 50);
    assert.equal(stats.summary.netRevenue, 1400);
    assert.equal(stats.summary.debt, 1150);
    assert.equal(stats.summary.overdueDebt, 1100);
    assert.equal(stats.summary.unpaidInvoiceCount, 3);
    assert.equal(stats.summary.averageResolutionHours, 4);
    assert.equal(stats.summary.resolvedCount, 2);
    assert.equal(stats.summary.reportCount, 3);
    assert.equal(stats.summary.reportsPerMonth, 1);
    assert.equal(stats.charts.failures[2].electricity, 1);
    assert.equal(stats.charts.failures[2].water, 1);
    assert.equal(stats.charts.failures[2].airConditioning, 1);
    assert.equal(stats.charts.resolution[2].averageHours, 4);
});

test('global occupancy and average resolution are weighted by places and tickets, not averages of chart rows', () => {
    const input = fixture();
    input.tickets = [
        ticket({ createdAt: '2026-08-01T00:00:00Z', resolvedAt: '2026-08-01T12:00:00Z' }),
        ...Array.from({ length: 3 }, () => ticket({ createdAt: '2026-09-01T00:00:00Z', resolvedAt: '2026-09-01T00:00:00Z' }))
    ];
    const stats = buildDashboardStatistics(input);
    assert.equal(stats.summary.occupancyRate, 68.75);
    assert.equal(stats.summary.averageResolutionHours, 3);
    assert.deepEqual(stats.charts.resolution.map(({ averageHours }) => averageHours), [12, 0, null]);
});

test('legacy receipts do not duplicate ledger entries outside the period or in another building', () => {
    const input = fixture();
    input.transactions = [transaction({ invoiceId: 'OLD', createdAt: '2026-07-01', maToaNha: 'B1', amount: 999 })];
    input.receipts = [{ maHopDong: 'OLD', soTien: 999, ngayThanhToan: '2026-10-01', hopDong: contractLink('A1') }];
    const stats = buildDashboardStatistics({ ...input, buildingIds: ['A1'] });
    assert.equal(stats.summary.collected, 0);
});

test('repair statistics count old reports resolved now, ignore future and invalid completion times, and retain category totals', () => {
    const input = fixture();
    input.tickets = [
        ticket({ category: 'unknown', createdAt: '2026-07-31T16:00:00Z', resolvedAt: '2026-08-01T16:00:00Z' }),
        ticket({ createdAt: '2026-10-01T00:00:00Z', resolvedAt: '2026-09-01T00:00:00Z' }),
        ticket({ createdAt: '2026-11-01T00:00:00Z', resolvedAt: '2026-11-02T00:00:00Z' }),
        ticket({ category: 'noi-that', status: 'IN_PROGRESS', resolvedAt: null }),
        ticket({ category: 'custom-category', status: 'PENDING', resolvedAt: null })
    ];
    const stats = buildDashboardStatistics(input);
    assert.equal(stats.summary.averageResolutionHours, 24);
    assert.equal(stats.summary.resolvedCount, 1);
    assert.equal(stats.summary.reportCount, 3);
    assert.equal(stats.charts.failures[2].furniture, 1);
    assert.equal(stats.charts.failures[2].other, 1);
});

const controllerFixture = ({ scope = ['A1'] } = {}) => {
    const input = fixture();
    const calls = {};
    const model = (key, rows) => ({ findMany: async (args) => { calls[key] = args; return rows; } });
    const db = {
        userBuildingAccess: model('scope', scope.map((maToaNha) => ({ maToaNha }))),
        toaNha: { findMany: async (args) => { calls.buildings = args; return args.where.maToaNha ? input.buildings.filter(({ maToaNha }) => args.where.maToaNha.in.includes(maToaNha)) : input.buildings; } },
        phong: model('rooms', input.rooms), hopDong: model('contracts', input.contracts),
        monthlyInvoice: model('monthlyInvoices', input.monthlyInvoices), maintenanceTicket: model('tickets', input.tickets),
        hoaDon: model('receipts', input.receipts), financialTransaction: model('transactions', input.transactions)
    };
    const controller = createDashboardController({ db, now: () => now });
    const invoke = async (role, query = {}) => {
        const res = response();
        await controller({ user: { id: 'staff1', role }, query }, res);
        return res;
    };
    return { calls, invoke };
};

test('board statistics page is limited to leadership and every role has an accessible home', async () => {
    const { roleCanAccess, homeForRole } = await import('../../frontend/src/utils/accessControl.js');
    const permissionGate = dashboardRouter.stack.find((layer) => layer.route?.path === '/').route.stack[1].handle;
    for (const role of ROLES.KNOWN_ROLES) {
        const expected = !['STUDENT', 'MILITARY_STUDENT', 'SERVICE_PROVIDER'].includes(role);
        assert.equal(ROLES.hasPermission(role, 'dashboard:read'), expected, role);
        assert.equal(roleCanAccess(role, '/'), ['BOARD_CHAIR', 'BOARD_DEPUTY', 'ADMIN'].includes(role), role);
        assert.equal(roleCanAccess(role, homeForRole(role)), true, `${role}: home`);
        let next = false;
        const res = response();
        permissionGate({ user: { role } }, res, () => { next = true; });
        assert.equal(next, expected, role);
        if (!expected) assert.equal(res.statusCode, 403);
    }
    const res = response();
    permissionGate({}, res, () => assert.fail('unauthenticated dashboard access'));
    assert.equal(res.statusCode, 401);
});

test('building staff and security statistics filter every source to assigned buildings and return only aggregates', async () => {
    for (const role of ['SECURITY', 'BUILDING_MANAGER', 'FACILITIES_MANAGER']) {
        const f = controllerFixture();
        const res = await f.invoke(role, { months: '3' });
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.data.scope.mode, 'assigned');
        assert.deepEqual(f.calls.rooms.where, { maToaNha: { in: ['A1'] } });
        assert.deepEqual(f.calls.contracts.where.phong, { is: { maToaNha: { in: ['A1'] } } });
        assert.deepEqual(f.calls.monthlyInvoices.where.hopDong.is.phong, f.calls.contracts.where.phong);
        assert.deepEqual(f.calls.receipts.where.hopDong.is.phong, f.calls.contracts.where.phong);
        assert.deepEqual(f.calls.tickets.where.phong, f.calls.contracts.where.phong);
        assert.deepEqual(f.calls.transactions.where.OR[0].maToaNha, { in: ['A1'] });
        assert.equal(f.calls.contracts.where.trangThai, 'PENDING_PAYMENT');
        assert.equal(f.calls.monthlyInvoices.where.status, 'UNPAID');
        assert.equal(res.body.data.summary.collected, 1450);
        const json = JSON.stringify(res.body);
        for (const field of ['maSinhVien', 'maHopDong', 'invoiceId', 'visitorPhone']) assert.equal(json.includes(`"${field}"`), false, field);
    }
});

test('global staff can filter by building without needing an assignment; out-of-scope buildings are denied', async () => {
    for (const role of ['BOARD_CHAIR', 'BOARD_DEPUTY', 'ARCHIVIST', 'ACCOUNTANT', 'TREASURER', 'MEDICAL_OFFICER', 'MILITARY_OFFICER', 'ADMIN']) {
        const f = controllerFixture({ scope: [] });
        const res = await f.invoke(role, { maToaNha: 'B1' });
        assert.equal(res.statusCode, 200, role);
        assert.equal(res.body.data.scope.mode, 'global');
        assert.equal(f.calls.scope, undefined);
        assert.deepEqual(f.calls.rooms.where, { maToaNha: { in: ['B1'] } });
        assert.equal(res.body.data.summary.occupied, 4);
    }
    const f = controllerFixture();
    assert.equal((await f.invoke('SECURITY', { maToaNha: 'B1' })).statusCode, 403);
    assert.equal(f.calls.rooms, undefined);
});

test('unassigned staff see empty statistics; malformed filters and unauthorized roles never query data', async () => {
    const f = controllerFixture({ scope: [] });
    const res = await f.invoke('SECURITY');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.summary.capacity, 0);
    assert.equal(res.body.data.summary.netRevenue, 0);
    assert.equal(res.body.data.scope.buildingCount, 0);
    for (const query of [{ months: '18' }, { months: ['6'] }, { months: 6 }, { maToaNha: [] }, { maToaNha: ' ' }]) {
        const f = controllerFixture();
        assert.equal((await f.invoke('SECURITY', query)).statusCode, 400);
        assert.deepEqual(f.calls, {});
    }
    for (const role of ['STUDENT', 'MILITARY_STUDENT', 'SERVICE_PROVIDER']) {
        const f = controllerFixture();
        assert.equal((await f.invoke(role)).statusCode, 403);
        assert.deepEqual(f.calls, {});
    }
});
