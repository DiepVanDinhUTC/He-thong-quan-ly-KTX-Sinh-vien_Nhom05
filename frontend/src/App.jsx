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
import SystemSettings from './pages/SystemSettings';
import StudentLayout from './components/StudentLayout';
import MyRoom from './pages/MyRoom';
import RequireRole from './components/RequireRole';
import { rolePermissions } from './utils/accessControl';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPortal />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin-dashboard" element={<Navigate to="/" replace />} />
      <Route path="/" element={<RequireRole allowedRoles={rolePermissions['/']}><AdminDashboard /></RequireRole>} />
      <Route path="/students" element={<RequireRole allowedRoles={rolePermissions['/students']}><StudentManagement /></RequireRole>} />
      <Route path="/rooms" element={<RequireRole allowedRoles={rolePermissions['/rooms']}><RoomManagement /></RequireRole>} />
      <Route path="/contracts" element={<RequireRole allowedRoles={rolePermissions['/contracts']}><ContractManagement /></RequireRole>} />
      <Route path="/tickets" element={<RequireRole allowedRoles={rolePermissions['/tickets']}><TicketManagement /></RequireRole>} />
      <Route element={<RequireRole allowedRoles={rolePermissions['/student-portal']}><StudentLayout /></RequireRole>}>
        <Route path="/student-portal" element={<StudentPortal />} />
        <Route path="/my-room" element={<MyRoom />} />
        <Route path="/room-registration" element={<RoomRegistration />} />
        <Route path="/ticket-report" element={<TicketReport />} />
        <Route path="/bill-payment" element={<BillPayment />} />
      </Route>
      <Route path="/financial-dashboard" element={<RequireRole allowedRoles={rolePermissions['/financial-dashboard']}><FinancialDashboard /></RequireRole>} />
      <Route path="/settings" element={<RequireRole allowedRoles={rolePermissions['/settings']}><SystemSettings /></RequireRole>} />
      <Route path="/technician" element={<RequireRole allowedRoles={rolePermissions['/technician']}><TechnicianApp /></RequireRole>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
