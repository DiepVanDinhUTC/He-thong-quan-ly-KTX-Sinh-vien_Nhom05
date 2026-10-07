import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPortal from './pages/LoginPortal';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import StudentManagement from './pages/StudentManagement';
import RoomManagement from './pages/RoomManagement';
import ContractManagement from './pages/ContractManagement';
import TicketManagement from './pages/TicketManagement';
import StudentPortal from './pages/StudentPortal';
import RoomRegistration from './pages/RoomRegistration';
import TicketReport from './pages/TicketReport';
import BillPayment from './pages/BillPayment';
import FinancialDashboard from './pages/FinancialDashboard';
import TechnicianApp from './pages/TechnicianApp';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPortal />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin-dashboard" element={<Navigate to="/" replace />} />
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/students" element={<StudentManagement />} />
      <Route path="/rooms" element={<RoomManagement />} />
      <Route path="/contracts" element={<ContractManagement />} />
      <Route path="/tickets" element={<TicketManagement />} />
      <Route path="/student-portal" element={<StudentPortal />} />
      <Route path="/room-registration" element={<RoomRegistration />} />
      <Route path="/ticket-report" element={<TicketReport />} />
      <Route path="/bill-payment" element={<BillPayment />} />
      <Route path="/financial-dashboard" element={<FinancialDashboard />} />
      <Route path="/technician" element={<TechnicianApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
