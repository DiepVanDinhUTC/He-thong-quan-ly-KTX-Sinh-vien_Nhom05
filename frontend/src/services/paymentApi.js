// src/services/paymentApi.js
import api from './api';

export const paymentApi = {
    mine: async () => (await api.get('/payments/mine')).data,
    monthlyInvoices: async (period) => (await api.get('/payments/monthly-invoices', { params: period ? { period } : {} })).data,
    generateMonthlyInvoices: async (data) => (await api.post('/payments/monthly-invoices/generate', data)).data,
    collectMonthlyInvoice: async (invoiceId, data) => (await api.post(`/payments/monthly-invoices/${encodeURIComponent(invoiceId)}/collect`, data)).data,
    refundMonthlyInvoice: async (invoiceId, data) => (await api.post(`/payments/monthly-invoices/${encodeURIComponent(invoiceId)}/refunds`, data)).data,
    ledger: async (period) => (await api.get('/payments/ledger', { params: period ? { period } : {} })).data,
    repairTickets: async () => (await api.get('/payments/repair-tickets')).data,
    recordRepairExpense: async (data) => (await api.post('/payments/repair-expenses', data)).data,
    reviewTransaction: async (id, note) => (await api.patch(`/payments/ledger/${encodeURIComponent(id)}/review`, { note })).data,
    createVnpayPayment: async (invoiceType, invoiceId) => (await api.post('/payments/vnpay/create', { invoiceType, invoiceId })).data
};
