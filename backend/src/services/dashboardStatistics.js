const { getContractInvoiceDueAt, getMonthlyInvoiceDueAt } = require('./invoiceDueDates');

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const round = (value) => Math.round(value * 100) / 100;
const amount = (value) => Math.max(0, Math.round(Number(value) || 0));
const timestamp = (value) => value == null ? NaN : new Date(value).getTime();
const monthKey = (value) => new Date(timestamp(value) + VIETNAM_OFFSET_MS).toISOString().slice(0, 7);
const CATEGORY_KEYS = { dien: 'electricity', nuoc: 'water', 'dieu-hoa': 'airConditioning', 'noi-that': 'furniture' };

const dashboardPeriod = (months, now) => {
    const localNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
    const buckets = Array.from({ length: months }, (_, index) => {
        const date = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth() - months + 1 + index, 1));
        const key = date.toISOString().slice(0, 7);
        return { period: key, label: `${key.slice(5)}/${key.slice(0, 4)}` };
    });
    const start = new Date(`${buckets[0].period}-01T00:00:00+07:00`);
    return { months, start, end: now, buckets };
};

const buildDashboardStatistics = ({ buildings, rooms, contracts, monthlyInvoices, tickets, receipts, transactions, period, buildingIds = null }) => {
    const buildingNames = new Map(buildings.map((building) => [building.maToaNha, building.tenToaNha]));
    const allowed = (id) => buildingIds === null || buildingIds.includes(id);
    const groupInfo = (id) => ({ buildingId: id || null, label: id || 'Chưa gán tòa', name: buildingNames.get(id) || id || 'Chưa gán tòa' });
    const withinPeriod = (value) => timestamp(value) >= period.start.getTime() && timestamp(value) <= period.end.getTime();
    const bucketFor = (map, value) => withinPeriod(value) ? map.get(monthKey(value)) : null;

    const occupancyByBuilding = new Map();
    for (const room of rooms) {
        if (!allowed(room.maToaNha)) continue;
        const key = room.maToaNha || '';
        if (!occupancyByBuilding.has(key)) occupancyByBuilding.set(key, { ...groupInfo(room.maToaNha), roomCount: 0, capacity: 0, occupied: 0 });
        const row = occupancyByBuilding.get(key);
        row.roomCount += 1;
        row.capacity += amount(room.soSinhVienToiDa);
        row.occupied += amount(room.soSinhVienHienTai);
    }
    const occupancy = [...occupancyByBuilding.values()].map((row) => ({
        ...row, available: Math.max(0, row.capacity - row.occupied), rate: row.capacity ? round(row.occupied / row.capacity * 100) : 0
    })).sort((left, right) => left.label.localeCompare(right.label, 'vi', { numeric: true }));

    const debtByBuilding = new Map();
    const addDebt = (buildingId, value, dueAt) => {
        if (!allowed(buildingId) || amount(value) === 0) return;
        const key = buildingId || '';
        if (!debtByBuilding.has(key)) debtByBuilding.set(key, { ...groupInfo(buildingId), total: 0, overdue: 0, pending: 0, invoiceCount: 0 });
        const row = debtByBuilding.get(key);
        const overdue = dueAt && dueAt.getTime() < period.end.getTime();
        row.total += amount(value);
        row[overdue ? 'overdue' : 'pending'] += amount(value);
        row.invoiceCount += 1;
    };
    for (const contract of contracts) addDebt(contract.phong?.maToaNha, contract.tongTien, getContractInvoiceDueAt(contract));
    for (const invoice of monthlyInvoices) addDebt(invoice.hopDong?.phong?.maToaNha, invoice.totalAmount, getMonthlyInvoiceDueAt(invoice));
    const debt = [...debtByBuilding.values()].sort((left, right) => right.total - left.total);

    const revenue = period.buckets.map((bucket) => ({ ...bucket, contractRevenue: 0, monthlyRevenue: 0, refunds: 0, netRevenue: 0 }));
    const revenueByMonth = new Map(revenue.map((row) => [row.period, row]));
    // Existing ledger collections take precedence over the receipt for the same contract,
    // including entries still awaiting review. This avoids counting a payment twice.
    const recordedContracts = new Set(transactions.filter((entry) => entry.invoiceType === 'CONTRACT' && entry.transactionType === 'COLLECTION').map((entry) => entry.invoiceId));
    for (const entry of transactions) {
        if (entry.status !== 'CONFIRMED' || !allowed(entry.maToaNha) || !['CONTRACT', 'MONTHLY'].includes(entry.invoiceType)) continue;
        const bucket = bucketFor(revenueByMonth, entry.createdAt);
        if (!bucket) continue;
        if (entry.transactionType === 'REFUND') bucket.refunds += amount(entry.amount);
        else if (entry.transactionType === 'COLLECTION') bucket[entry.invoiceType === 'CONTRACT' ? 'contractRevenue' : 'monthlyRevenue'] += amount(entry.amount);
    }
    for (const receipt of receipts) {
        if (recordedContracts.has(receipt.maHopDong) || !allowed(receipt.hopDong?.phong?.maToaNha)) continue;
        const bucket = bucketFor(revenueByMonth, receipt.ngayThanhToan);
        if (bucket) bucket.contractRevenue += amount(receipt.soTien);
    }
    for (const row of revenue) row.netRevenue = row.contractRevenue + row.monthlyRevenue - row.refunds;

    const resolution = period.buckets.map((bucket) => ({ ...bucket, resolvedCount: 0, totalHours: 0, averageHours: null }));
    const failures = period.buckets.map((bucket) => ({ ...bucket, count: 0, electricity: 0, water: 0, airConditioning: 0, furniture: 0, other: 0 }));
    const resolutionByMonth = new Map(resolution.map((row) => [row.period, row]));
    const failuresByMonth = new Map(failures.map((row) => [row.period, row]));
    for (const ticket of tickets) {
        if (ticket.status === 'REJECTED' || !allowed(ticket.phong?.maToaNha)) continue;
        const reported = bucketFor(failuresByMonth, ticket.createdAt);
        if (reported) {
            reported.count += 1;
            reported[CATEGORY_KEYS[ticket.category] || 'other'] += 1;
        }
        if (!['WAITING_ACCEPTANCE', 'COMPLETED'].includes(ticket.status)) continue;
        const resolvedAt = ticket.resolvedAt || ticket.completedAt;
        const completed = bucketFor(resolutionByMonth, resolvedAt);
        const hours = (timestamp(resolvedAt) - timestamp(ticket.createdAt)) / (60 * 60 * 1000);
        if (!completed || !Number.isFinite(hours) || hours < 0) continue;
        completed.resolvedCount += 1;
        completed.totalHours += hours;
    }
    const resolvedCount = resolution.reduce((sum, row) => sum + row.resolvedCount, 0);
    const totalHours = resolution.reduce((sum, row) => sum + row.totalHours, 0);
    for (const row of resolution) {
        row.averageHours = row.resolvedCount ? round(row.totalHours / row.resolvedCount) : null;
        delete row.totalHours;
    }
    const capacity = occupancy.reduce((sum, row) => sum + row.capacity, 0);
    const occupied = occupancy.reduce((sum, row) => sum + row.occupied, 0);
    const reportCount = failures.reduce((sum, row) => sum + row.count, 0);
    return {
        summary: {
            roomCount: occupancy.reduce((sum, row) => sum + row.roomCount, 0), capacity, occupied,
            occupancyRate: capacity ? round(occupied / capacity * 100) : 0,
            collected: revenue.reduce((sum, row) => sum + row.contractRevenue + row.monthlyRevenue, 0),
            refunds: revenue.reduce((sum, row) => sum + row.refunds, 0),
            netRevenue: revenue.reduce((sum, row) => sum + row.netRevenue, 0),
            debt: debt.reduce((sum, row) => sum + row.total, 0),
            overdueDebt: debt.reduce((sum, row) => sum + row.overdue, 0),
            unpaidInvoiceCount: debt.reduce((sum, row) => sum + row.invoiceCount, 0),
            averageResolutionHours: resolvedCount ? round(totalHours / resolvedCount) : null,
            resolvedCount, reportCount, reportsPerMonth: round(reportCount / period.months)
        },
        charts: { occupancy, revenue, debt, resolution, failures }
    };
};

module.exports = { dashboardPeriod, buildDashboardStatistics };
