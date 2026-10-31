const CONTRACT_PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000;
const VIETNAM_TIME_OFFSET_MS = 7 * 60 * 60 * 1000;
const PRIORITY_PAYMENT_WINDOW_MS = 30 * 60 * 1000;

// Business days exclude weekends and any explicitly configured Vietnam-local holidays.
const calculateContractDueAt = (approvedAt, autoApproved = false, holidays = []) => {
    const start = new Date(approvedAt);
    if (Number.isNaN(start.getTime())) throw new Error('Thời điểm duyệt hợp đồng không hợp lệ.');
    if (autoApproved) return new Date(start.getTime() + PRIORITY_PAYMENT_WINDOW_MS);
    const local = new Date(start.getTime() + VIETNAM_TIME_OFFSET_MS);
    const holidaySet = new Set(holidays);
    let businessDays = 0;
    while (businessDays < 3) {
        local.setUTCDate(local.getUTCDate() + 1);
        const day = local.getUTCDay();
        if (day !== 0 && day !== 6 && !holidaySet.has(local.toISOString().slice(0, 10))) businessDays += 1;
    }
    return new Date(local.getTime() - VIETNAM_TIME_OFFSET_MS);
};

const configuredHolidays = () => (process.env.CONTRACT_PAYMENT_HOLIDAYS || '').split(',').map((item) => item.trim()).filter(Boolean);

const getContractInvoiceDueAt = (contract) => {
    if (contract?.paymentDueAt) {
        const deadline = new Date(contract.paymentDueAt);
        return Number.isNaN(deadline.getTime()) ? null : deadline;
    }
    const createdAt = new Date(contract?.ngayTao || contract);
    if (Number.isNaN(createdAt.getTime())) return null;
    return new Date(createdAt.getTime() + CONTRACT_PAYMENT_WINDOW_MS);
};

// Monthly bills are due at the start of the month after their billing period.
const getMonthlyInvoiceDueAt = (invoice) => {
    const periodStart = new Date(invoice?.periodStart || invoice);
    if (Number.isNaN(periodStart.getTime())) return null;
    return new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1) - VIETNAM_TIME_OFFSET_MS);
};

module.exports = { CONTRACT_PAYMENT_WINDOW_MS, PRIORITY_PAYMENT_WINDOW_MS, calculateContractDueAt, configuredHolidays, getContractInvoiceDueAt, getMonthlyInvoiceDueAt };
