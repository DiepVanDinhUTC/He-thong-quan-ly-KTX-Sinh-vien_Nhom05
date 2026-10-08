// src/services/authApi.js
import api from './api';

export const authApi = {
    login: async (username, password) => {
        // Gọi lên route POST /api/v1/auth/login của Backend
        const response = await api.post('/auth/login', { username, password });
        return response.data; // Trả về data gồm: token và thông tin user
    },
    me: async () => (await api.get('/auth/me')).data,
    updateMyContact: async (contact) => (await api.patch('/auth/me/contact', contact)).data,
    changeMyPassword: async (passwords) => (await api.patch('/auth/me/password', passwords)).data,
    requestPasswordReset: async (identifier) => (await api.post('/auth/forgot-password', { identifier })).data,
    resetPassword: async (payload) => (await api.post('/auth/reset-password', payload)).data,
};
