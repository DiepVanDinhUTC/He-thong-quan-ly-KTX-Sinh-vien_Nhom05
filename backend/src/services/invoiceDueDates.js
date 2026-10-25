const CONTRACT_PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000;
const VIETNAM_TIME_OFFSET_MS = 7 * 60 * 60 * 1000;

const getContractInvoiceDueAt = (contract) => {
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

module.exports = { CONTRACT_PAYMENT_WINDOW_MS, getContractInvoiceDueAt, getMonthlyInvoiceDueAt };
