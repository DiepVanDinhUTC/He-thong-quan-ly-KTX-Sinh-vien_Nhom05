const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware xử lý JSON và CORS
app.use(express.json({ limit: '10mb' }));
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
const ticketRoutes = require('./src/routes/api/v1/tickets');
const utilityRoutes = require('./src/routes/api/v1/utilities');
const studentSelfServiceRoutes = require('./src/routes/api/v1/studentSelfService');
const securityMedicalRoutes = require('./src/routes/api/v1/securityMedical');
const staffAccountRoutes = require('./src/routes/api/v1/staffAccounts');
const studentBillNotificationRoutes = require('./src/routes/api/v1/studentBillNotifications');
const militaryManagementRoutes = require('./src/routes/api/v1/militaryManagement');
const dangKyKtxRoutes = require('./src/routes/api/v1/dangKyKtx');
const phongRoutes = require('./src/routes/api/v1/phongRoutes');
const baoHongRoutes = require('./src/routes/api/v1/baoHongRoutes');
const yTeRoutes = require('./src/routes/api/v1/yTeRoutes');
const gdqpAllocationRoutes = require('./src/routes/api/v1/gdqpAllocationRoutes');

// Gắn Route vào ứng dụng
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Backend is running' });
});
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/mock/sis-utc', mockSisRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/utilities', utilityRoutes);
app.use('/api/v1/self-service', studentSelfServiceRoutes);
app.use('/api/v1/security-medical', securityMedicalRoutes);
app.use('/api/v1/staff-accounts', staffAccountRoutes);
app.use('/api/v1/notifications', studentBillNotificationRoutes);
app.use('/api/v1/military-management', militaryManagementRoutes);

app.use('/api/v1/dang-ky-ktx', dangKyKtxRoutes);
app.use('/api/v1/phong', phongRoutes);
app.use('/api/v1/bao-hong', baoHongRoutes);
app.use('/api/v1/y-te', yTeRoutes);
app.use('/api/v1/gdqp', gdqpAllocationRoutes);

require('./src/cronjobs/contractCron'); // Import cronjob để chạy tự động
require('./src/cronjobs/militaryStudentSyncCron'); // Đồng bộ đăng ký GDQP và cấp tài khoản học viên quân sự
require('./src/cronjobs/ticketSlaCron'); // Cảnh báo ticket sửa chữa vượt thời hạn SLA

// Khởi chạy server
require('./src/cronjobs/studentBillNotificationCron');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server KTX đang chạy tại http://localhost:${PORT}`);
});
