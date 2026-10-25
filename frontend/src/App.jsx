import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPortal from './pages/LoginPortal';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import StudentManagement from './pages/StudentManagement';
import RoomManagement from './pages/RoomManagement';
import BuildingManagement from './pages/BuildingManagement';
import AssetCatalogManagement from './pages/AssetCatalogManagement';
import ContractManagement from './pages/ContractManagement';
import TicketManagement from './pages/TicketManagement';
import StudentPortal from './pages/StudentPortal';
import RoomRegistration from './pages/RoomRegistration';
import TicketReport from './pages/TicketReport';
import BillPayment from './pages/BillPayment';
import FinancialDashboard from './pages/FinancialDashboard';
import SystemSettings from './pages/SystemSettings';
import StudentLayout from './components/StudentLayout';
import MyRoom from './pages/MyRoom';
import ServiceRegistration from './pages/ServiceRegistration';
import SelfServiceManagement from './pages/SelfServiceManagement';
import SecurityMedicalManagement from './pages/SecurityMedicalManagement';
import MeterReadingManagement from './pages/MeterReadingManagement';
import StaffAccountManagement from './pages/StaffAccountManagement';
import MilitaryManagement from './pages/MilitaryManagement';
import RequireRole from './components/RequireRole';
import AdminTestSwitcher from './components/AdminTestSwitcher';
import { rolePermissions } from './utils/accessControl';

function App() {
  return (
    <>
    <Routes>
      <Route path="/login" element={<LoginPortal />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin-dashboard" element={<Navigate to="/" replace />} />
      <Route path="/" element={<RequireRole allowedRoles={rolePermissions['/']}><AdminDashboard /></RequireRole>} />
      <Route path="/students" element={<RequireRole allowedRoles={rolePermissions['/students']}><StudentManagement /></RequireRole>} />
      <Route path="/staff-accounts" element={<RequireRole allowedRoles={rolePermissions['/staff-accounts']}><StaffAccountManagement /></RequireRole>} />
      <Route path="/rooms" element={<RequireRole allowedRoles={rolePermissions['/rooms']}><RoomManagement /></RequireRole>} />
      <Route path="/buildings" element={<RequireRole allowedRoles={rolePermissions['/buildings']}><BuildingManagement /></RequireRole>} />
      <Route path="/assets" element={<RequireRole allowedRoles={rolePermissions['/assets']}><AssetCatalogManagement /></RequireRole>} />
      <Route path="/meter-readings" element={<RequireRole allowedRoles={rolePermissions['/meter-readings']}><MeterReadingManagement /></RequireRole>} />
      <Route path="/contracts" element={<RequireRole allowedRoles={rolePermissions['/contracts']}><ContractManagement /></RequireRole>} />
      <Route path="/tickets" element={<RequireRole allowedRoles={rolePermissions['/tickets']}><TicketManagement /></RequireRole>} />
      <Route path="/self-service" element={<RequireRole allowedRoles={rolePermissions['/self-service']}><SelfServiceManagement /></RequireRole>} />
      <Route path="/security-medical" element={<RequireRole allowedRoles={rolePermissions['/security-medical']}><SecurityMedicalManagement /></RequireRole>} />
      <Route path="/military-management" element={<RequireRole allowedRoles={rolePermissions['/military-management']}><MilitaryManagement /></RequireRole>} />
      <Route element={<RequireRole allowedRoles={rolePermissions['/student-portal']}><StudentLayout /></RequireRole>}>
        <Route path="/student-portal" element={<StudentPortal />} />
        <Route path="/my-room" element={<MyRoom />} />
        <Route path="/room-registration" element={<RequireRole allowedRoles={rolePermissions['/room-registration']}><RoomRegistration /></RequireRole>} />
        <Route path="/housing-requests" element={<Navigate to="/my-room" replace />} />
        <Route path="/service-registration" element={<RequireRole allowedRoles={rolePermissions['/service-registration']}><ServiceRegistration /></RequireRole>} />
        <Route path="/ticket-report" element={<TicketReport />} />
        <Route path="/bill-payment" element={<BillPayment />} />
      </Route>
      <Route path="/financial-dashboard" element={<RequireRole allowedRoles={rolePermissions['/financial-dashboard']}><FinancialDashboard /></RequireRole>} />
      <Route path="/bills" element={<Navigate to="/financial-dashboard" replace />} />
      <Route path="/settings" element={<RequireRole allowedRoles={rolePermissions['/settings']}><SystemSettings /></RequireRole>} />
      <Route path="/technician" element={<Navigate to="/tickets" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <AdminTestSwitcher />
    </>
  );
}

export default App;
