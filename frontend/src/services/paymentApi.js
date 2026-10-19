// src/services/paymentApi.js
import api from './api';

export const paymentApi = {
    mine: async () => (await api.get('/payments/mine')).data,
    monthlyInvoices: async () => (await api.get('/payments/monthly-invoices')).data,
    createVnpayPayment: async (invoiceType, invoiceId) => (await api.post('/payments/vnpay/create', { invoiceType, invoiceId })).data
};
