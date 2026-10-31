const prisma = require('../config/prisma');
const ROLES = require('../config/roles');
const { dashboardPeriod, buildDashboardStatistics } = require('../services/dashboardStatistics');
const { occupancyRelations, presentRoomOccupancy } = require('../services/roomOccupancy');

const ASSIGNED_DASHBOARD_ROLES = new Set([ROLES.FACILITIES_MANAGER, ROLES.BUILDING_MANAGER, ROLES.SECURITY]);
const fail = (status, message) => Object.assign(new Error(message), { status });

const createDashboardController = ({ db = prisma, now = () => new Date() } = {}) => async (req, res) => {
    if (!ROLES.hasPermission(req.user?.role, 'dashboard:read')) return res.status(403).json({ success: false, message: 'Tài khoản không có quyền xem thống kê BQL.' });
    const months = req.query.months ?? '6';
    const selectedBuilding = req.query.maToaNha;
    if (!['3', '6', '12'].includes(months) || (selectedBuilding !== undefined && (typeof selectedBuilding !== 'string' || !selectedBuilding.trim() || selectedBuilding.length > 20))) {
        return res.status(400).json({ success: false, message: 'Chọn khoảng thống kê 3, 6 hoặc 12 tháng và tòa nhà hợp lệ.' });
    }
    try {
        const generatedAt = now();
        const period = dashboardPeriod(Number(months), generatedAt);
        const assigned = ASSIGNED_DASHBOARD_ROLES.has(req.user.role);
        const scope = assigned ? (await db.userBuildingAccess.findMany({
            where: { userId: req.user.id }, select: { maToaNha: true }
        })).map(({ maToaNha }) => maToaNha) : null;
        const buildings = await db.toaNha.findMany({
            where: scope === null ? {} : { maToaNha: { in: scope } },
            select: { maToaNha: true, tenToaNha: true }, orderBy: { maToaNha: 'asc' }
        });
        if (selectedBuilding && !buildings.some(({ maToaNha }) => maToaNha === selectedBuilding)) throw fail(403, 'Tòa nhà không thuộc phạm vi thống kê của tài khoản.');
        const buildingIds = selectedBuilding ? [selectedBuilding] : scope;
        const scoped = buildingIds !== null;
        const roomScope = scoped ? { maToaNha: { in: buildingIds } } : {};
        const contractScope = scoped ? { phong: { is: roomScope } } : {};
        const invoiceScope = scoped ? { hopDong: { is: contractScope } } : {};
        const dateRange = { gte: period.start, lte: period.end };
        const [rooms, contracts, monthlyInvoices, tickets, receipts] = await Promise.all([
            db.phong.findMany({ where: roomScope, select: { maToaNha: true, soSinhVienToiDa: true, soSinhVienHienTai: true, ...occupancyRelations } }),
            db.hopDong.findMany({ where: { trangThai: 'PENDING_PAYMENT', ...contractScope }, select: { tongTien: true, ngayTao: true, paymentDueAt: true, phong: { select: { maToaNha: true } } } }),
            db.monthlyInvoice.findMany({ where: { status: 'UNPAID', ...invoiceScope }, select: { totalAmount: true, periodStart: true, hopDong: { select: { phong: { select: { maToaNha: true } } } } } }),
            db.maintenanceTicket.findMany({
                where: { ...contractScope, status: { not: 'REJECTED' }, OR: [{ createdAt: dateRange }, { resolvedAt: dateRange }, { completedAt: dateRange }] },
                select: { category: true, status: true, createdAt: true, resolvedAt: true, completedAt: true, phong: { select: { maToaNha: true } } }
            }),
            db.hoaDon.findMany({ where: { ngayThanhToan: dateRange, ...invoiceScope }, select: { maHopDong: true, soTien: true, ngayThanhToan: true, hopDong: { select: { phong: { select: { maToaNha: true } } } } } })
        ]);
        const receiptContracts = [...new Set(receipts.map(({ maHopDong }) => maHopDong))];
        const transactions = await db.financialTransaction.findMany({
            where: {
                transactionType: { in: ['COLLECTION', 'REFUND'] }, invoiceType: { in: ['CONTRACT', 'MONTHLY'] },
                OR: [
                    { createdAt: dateRange, ...(scoped ? { maToaNha: { in: buildingIds } } : {}) },
                    ...(receiptContracts.length ? [{ invoiceType: 'CONTRACT', invoiceId: { in: receiptContracts }, transactionType: 'COLLECTION' }] : [])
                ]
            },
            select: { invoiceType: true, invoiceId: true, transactionType: true, amount: true, status: true, createdAt: true, maToaNha: true }
        });
        const statistics = buildDashboardStatistics({ buildings, rooms: rooms.map(presentRoomOccupancy), contracts, monthlyInvoices, tickets, receipts, transactions, period, buildingIds });
        return res.json({ success: true, data: {
            generatedAt, period: { months: period.months, start: period.start, end: period.end },
            scope: { mode: assigned ? 'assigned' : 'global', selectedBuilding: selectedBuilding || null, buildingCount: buildings.length },
            buildings, ...statistics
        } });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        console.error(`[dashboard] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải thống kê KTX. Vui lòng thử lại.' });
    }
};

module.exports = { overview: createDashboardController(), createDashboardController };
