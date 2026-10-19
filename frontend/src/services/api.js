// src/services/api.js
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        const skipAdminTestMode = config.skipAdminTestMode === true;
        delete config.skipAdminTestMode;
        const testAccount = localStorage.getItem('adminTestAccount');
        if (!skipAdminTestMode && testAccount) config.headers['X-Admin-Test-Account'] = testAccount;
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
