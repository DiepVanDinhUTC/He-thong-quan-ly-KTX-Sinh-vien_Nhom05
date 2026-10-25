// src/store/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: null,
    token: localStorage.getItem('accessToken') || null,
    isAuthenticated: !!localStorage.getItem('accessToken'),
    adminTestAccount: localStorage.getItem('adminTestAccount') || null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginSuccess: (state, action) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
            state.adminTestAccount = null;
            localStorage.setItem('accessToken', action.payload.token);
            localStorage.removeItem('adminTestAccount');
        },
        userUpdated: (state, action) => {
            state.user = action.payload;
        },
        adminTestAccountChanged: (state, action) => {
            state.adminTestAccount = action.payload || null;
            if (state.adminTestAccount) localStorage.setItem('adminTestAccount', state.adminTestAccount);
            else localStorage.removeItem('adminTestAccount');
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.adminTestAccount = null;
            localStorage.removeItem('accessToken');
            localStorage.removeItem('adminTestAccount');
        }
    }
});

export const { loginSuccess, userUpdated, adminTestAccountChanged, logout } = authSlice.actions;
export default authSlice.reducer;
