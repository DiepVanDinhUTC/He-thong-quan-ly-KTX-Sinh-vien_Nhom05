// src/services/paymentApi.js
import api from './api';

export const paymentApi = {
    getQRCode: async (maHopDong) => {
        const response = await api.get(`/payments/${maHopDong}/qr`);
        return response.data; // Trả về { success, data: { tongTien, noiDungCK, qrCodeImage } }
    }
};