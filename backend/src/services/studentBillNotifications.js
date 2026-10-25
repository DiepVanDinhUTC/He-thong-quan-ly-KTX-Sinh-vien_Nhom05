const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');
const { getContractInvoiceDueAt, getMonthlyInvoiceDueAt } = require('./invoiceDueDates');

const formatMoney = (amount) => `${Math.round(Number(amount) || 0).toLocaleString('vi-VN')} đ`;
const formatDate = (date) => new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
}).format(date);

const buildNotice = ({ studentId, invoiceType, invoiceId, invoiceName, amount, dueAt, kind }) => {
    const isOverdue = kind === 'OVERDUE';
    const title = isOverdue ? 'Hóa đơn đã quá hạn' : `Nhắc thanh toán ${invoiceName}`;
    const statusText = isOverdue
        ? `đã quá hạn từ ${formatDate(dueAt)}`
        : `đến hạn thanh toán ngày ${formatDate(dueAt)}`;

    return {
        id: randomUUID(),
        maSinhVien: studentId,
        invoiceType,
        invoiceId,
        kind,
        dedupeKey: `${invoiceType}:${invoiceId}:${kind}`,
        title,
        message: `${invoiceName} ${invoiceId} ${statusText}. Số tiền: ${formatMoney(amount)}. Vui lòng xem và thanh toán trong mục Hóa đơn.`,
    };
};

const createStudentBillNotificationSync = ({ db = prisma, now = () => new Date() } = {}) => async (studentId) => {
    if (!studentId) return { remindersCreated: 0, overdueCreated: 0, resolved: 0 };
    const currentTime = now();
    const [contracts, monthlyInvoices] = await Promise.all([
        db.hopDong.findMany({
            where: { maSinhVien: studentId, trangThai: 'PENDING_PAYMENT' },
            select: { maHopDong: true, maSinhVien: true, ngayTao: true, tongTien: true }
        }),
        db.monthlyInvoice.findMany({
            where: { maSinhVien: studentId, status: 'UNPAID' },
            select: { id: true, maSinhVien: true, periodStart: true, totalAmount: true }
        })
    ]);

    const [closedContracts, settledMonthlyBills] = await Promise.all([
        db.studentBillNotification.updateMany({
            where: {
                maSinhVien: studentId,
                invoiceType: 'CONTRACT',
                resolvedAt: null,
                ...(contracts.length ? { invoiceId: { notIn: contracts.map(({ maHopDong }) => maHopDong) } } : {})
            },
            data: { resolvedAt: currentTime }
        }),
        db.studentBillNotification.updateMany({
            where: {
                maSinhVien: studentId,
                invoiceType: 'MONTHLY',
                resolvedAt: null,
                ...(monthlyInvoices.length ? { invoiceId: { notIn: monthlyInvoices.map(({ id }) => id) } } : {})
            },
            data: { resolvedAt: currentTime }
        })
    ]);

    const pendingNotices = [];
    const overdueNotices = [];
    for (const contract of contracts) {
        const dueAt = getContractInvoiceDueAt(contract);
        if (!dueAt) continue;
        const details = {
            studentId,
            invoiceType: 'CONTRACT',
            invoiceId: contract.maHopDong,
            invoiceName: 'phí hợp đồng lưu trú',
            amount: contract.tongTien,
            dueAt
        };
        pendingNotices.push(buildNotice({ ...details, kind: 'REMINDER' }));
        if (dueAt.getTime() < currentTime.getTime()) {
            overdueNotices.push(buildNotice({ ...details, kind: 'OVERDUE' }));
        }
    }

    for (const invoice of monthlyInvoices) {
        const dueAt = getMonthlyInvoiceDueAt(invoice);
        if (!dueAt) continue;
        const period = new Date(invoice.periodStart);
        const invoiceName = `hóa đơn tháng ${period.getUTCMonth() + 1}/${period.getUTCFullYear()}`;
        const details = {
            studentId,
            invoiceType: 'MONTHLY',
            invoiceId: invoice.id,
            invoiceName,
            amount: invoice.totalAmount,
            dueAt
        };
        pendingNotices.push(buildNotice({ ...details, kind: 'REMINDER' }));
        if (dueAt.getTime() < currentTime.getTime()) {
            overdueNotices.push(buildNotice({ ...details, kind: 'OVERDUE' }));
        }
    }

    const [reminders, overdue] = await Promise.all([
        pendingNotices.length
            ? db.studentBillNotification.createMany({ data: pendingNotices, skipDuplicates: true })
            : { count: 0 },
        overdueNotices.length
            ? db.studentBillNotification.createMany({ data: overdueNotices, skipDuplicates: true })
            : { count: 0 }
    ]);

    return {
        remindersCreated: reminders.count,
        overdueCreated: overdue.count,
        resolved: closedContracts.count + settledMonthlyBills.count
    };
};

const syncStudentBillNotifications = createStudentBillNotificationSync();

module.exports = { createStudentBillNotificationSync, syncStudentBillNotifications };
