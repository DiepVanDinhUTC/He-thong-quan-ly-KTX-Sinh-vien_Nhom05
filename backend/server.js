const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware xử lý JSON và CORS
app.use(express.json());
app.use(cors());

app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true, service: 'ktx-backend' });
});

// Khai báo các Route
const authRoutes = require('./src/routes/api/v1/auth');
const studentRoutes = require('./src/routes/api/v1/students');
const mockSisRoutes = require('./src/routes/api/v1/mockSisUtc');
const contractRoutes = require('./src/routes/api/v1/contractRoutes');
const applicationRoutes = require('./src/routes/api/v1/applications');
const roomRoutes = require('./src/routes/api/v1/rooms');
const paymentRoutes = require('./src/routes/api/v1/paymentRoutes');
const webhookRoutes = require('./src/routes/api/v1/webhookRoutes');

// Gắn Route vào ứng dụng
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/mock/sis-utc', mockSisRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

require('./src/cronjobs/contractCron'); // Import cronjob để chạy tự động

// Khởi chạy server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server KTX đang chạy tại http://localhost:${PORT}`);
});
