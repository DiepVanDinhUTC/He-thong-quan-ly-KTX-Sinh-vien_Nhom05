const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware xử lý JSON và CORS
app.use(express.json());
app.use(cors());

// Khai báo các Route
const authRoutes = require('./src/routes/api/v1/auth');
const studentRoutes = require('./src/routes/api/v1/students');
const mockSisRoutes = require('./src/routes/api/v1/mockSisUtc');

// Gắn Route vào ứng dụng
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/mock/sis-utc', mockSisRoutes);

// Khởi chạy server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server KTX đang chạy tại http://localhost:${PORT}`);
});