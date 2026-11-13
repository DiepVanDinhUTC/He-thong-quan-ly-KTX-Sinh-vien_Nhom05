import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const LoginPortal = lazy(() => import('./pages/LoginPortal'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const DashboardOverview = lazy(() => import('./pages/DashboardOverview'));
const StudentManagement = lazy(() => import('./pages/StudentManagement'));
const RoomManagement = lazy(() => import('./pages/RoomManagement'));
const BuildingManagement = lazy(() => import('./pages/BuildingManagement'));
const AssetCatalogManagement = lazy(() => import('./pages/AssetCatalogManagement'));
const ContractManagement = lazy(() => import('./pages/ContractManagement'));
const TicketManagement = lazy(() => import('./pages/TicketManagement'));
const StudentPortal = lazy(() => import('./pages/StudentPortal'));
const DormitoryRulesPage = lazy(() => import('./pages/DormitoryRulesPage'));
const RoomRegistration = lazy(() => import('./pages/RoomRegistration'));
const TicketReport = lazy(() => import('./pages/TicketReport'));
const BillPayment = lazy(() => import('./pages/BillPayment'));
const FinancialDashboard = lazy(() => import('./pages/FinancialDashboard'));
const FacilitiesHome = lazy(() => import('./pages/StaffHome').then((module) => ({ default: module.FacilitiesHome })));
const FinancialHome = lazy(() => import('./pages/StaffHome').then((module) => ({ default: module.FinancialHome }))); 
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
import StudentLayout from './components/StudentLayout';
const MyRoom = lazy(() => import('./pages/MyRoom'));
const MilitaryStudentStay = lazy(() => import('./pages/MilitaryStudentStay'));
const ServiceRegistration = lazy(() => import('./pages/ServiceRegistration'));
const SelfServiceManagement = lazy(() => import('./pages/SelfServiceManagement'));
const SecurityMedicalManagement = lazy(() => import('./pages/SecurityMedicalManagement'));
const SecurityHome = lazy(() => import('./pages/SecurityHome'));
const MedicalHome = lazy(() => import('./pages/MedicalHome'));
const MeterReadingManagement = lazy(() => import('./pages/MeterReadingManagement'));
const StaffAccountManagement = lazy(() => import('./pages/StaffAccountManagement'));
const MilitaryManagement = lazy(() => import('./pages/MilitaryManagement'));
const ArchivistManagement = lazy(() => import('./pages/ArchivistManagement'));
import RequireRole from './components/RequireRole';
import AdminTestSwitcher from './components/AdminTestSwitcher';
import BoardLayout from './components/BoardLayout';
import { rolePermissions } from './utils/accessControl';

function App() {
  const user = useSelector((state) => state.auth.user);
  const role = user?.role;
  return (
    <>
    <Suspense fallback={<div role="status" aria-live="polite" style={{ padding: 24 }}>Đang tải trang...</div>}>
    <Routes>
      <Route path="/login" element={<LoginPortal />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin-dashboard" element={<Navigate to="/" replace />} />
      <Route element={<BoardLayout />}>
      <Route path="/" element={<RequireRole allowedRoles={rolePermissions['/']}><DashboardOverview key={`${role}:${user?.id}`} /></RequireRole>} />
      <Route path="/facilities" element={<RequireRole allowedRoles={rolePermissions['/facilities']}><FacilitiesHome /></RequireRole>} />
      <Route path="/students" element={<RequireRole allowedRoles={rolePermissions['/students']}><StudentManagement /></RequireRole>} />
      <Route path="/staff-accounts" element={<RequireRole allowedRoles={rolePermissions['/staff-accounts']}><StaffAccountManagement /></RequireRole>} />
      <Route path="/rooms" element={<RequireRole allowedRoles={rolePermissions['/rooms']}><RoomManagement /></RequireRole>} />
      <Route path="/buildings" element={<RequireRole allowedRoles={rolePermissions['/buildings']}><BuildingManagement /></RequireRole>} />
      <Route path="/assets" element={<RequireRole allowedRoles={rolePermissions['/assets']}><AssetCatalogManagement /></RequireRole>} />
      <Route path="/meter-readings" element={<RequireRole allowedRoles={rolePermissions['/meter-readings']}><MeterReadingManagement /></RequireRole>} />
      <Route path="/contracts" element={<RequireRole allowedRoles={rolePermissions['/contracts']}><ContractManagement /></RequireRole>} />
      <Route path="/tickets" element={<RequireRole allowedRoles={rolePermissions['/tickets']}><TicketManagement /></RequireRole>} />
      <Route path="/self-service" element={<RequireRole allowedRoles={rolePermissions['/self-service']}><SelfServiceManagement /></RequireRole>} />
      <Route path="/security" element={<RequireRole allowedRoles={rolePermissions['/security']}><SecurityHome /></RequireRole>} />
      <Route path="/medical" element={<RequireRole allowedRoles={rolePermissions['/medical']}><MedicalHome /></RequireRole>} />
      <Route path="/security/visitors" element={<RequireRole allowedRoles={rolePermissions['/security/visitors']}><SecurityMedicalManagement key="security-visitors" securitySection="access" /></RequireRole>} />
      <Route path="/security/violations" element={<RequireRole allowedRoles={rolePermissions['/security/violations']}><SecurityMedicalManagement key="security-violations" securitySection="violations" /></RequireRole>} />
      <Route path="/security-medical" element={<RequireRole allowedRoles={rolePermissions['/security-medical']}>{role === 'SECURITY' ? <Navigate to="/security" replace /> : <SecurityMedicalManagement />}</RequireRole>} />
      <Route path="/military-management" element={<RequireRole allowedRoles={rolePermissions['/military-management']}><MilitaryManagement /></RequireRole>} />
      <Route path="/archive-management" element={<RequireRole allowedRoles={rolePermissions['/archive-management']}><ArchivistManagement /></RequireRole>} />
      <Route element={<RequireRole allowedRoles={rolePermissions['/student-portal']}><StudentLayout /></RequireRole>}>
        <Route path="/student-portal" element={<StudentPortal />} />
        <Route path="/dormitory-rules" element={<DormitoryRulesPage />} />
        <Route path="/my-room" element={<MyRoom />} />
        <Route path="/military-stay" element={<MilitaryStudentStay />} />
        <Route path="/room-registration" element={<RequireRole allowedRoles={rolePermissions['/room-registration']}><RoomRegistration /></RequireRole>} />
        <Route path="/housing-requests" element={<Navigate to="/my-room" replace />} />
        <Route path="/service-registration" element={<RequireRole allowedRoles={rolePermissions['/service-registration']}><ServiceRegistration /></RequireRole>} />
        <Route path="/ticket-report" element={<TicketReport />} />
        <Route path="/bill-payment" element={<BillPayment />} />
      </Route>
      <Route path="/financial-dashboard" element={<RequireRole allowedRoles={rolePermissions['/financial-dashboard']}><FinancialHome /></RequireRole>} />
      <Route path="/bills" element={<Navigate to="/financial-dashboard/invoices" replace />} />
      <Route path="/financial-dashboard/:section" element={<RequireRole allowedRoles={rolePermissions['/financial-dashboard']}><FinancialDashboard /></RequireRole>} />
      <Route path="/settings" element={<RequireRole allowedRoles={rolePermissions['/settings']}><SystemSettings /></RequireRole>} />
      <Route path="/technician" element={<Navigate to="/tickets" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
    <AdminTestSwitcher />
    </>
  );
}

export default App;
