// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        // Thêm các reducer khác vào đây sau
    }
});