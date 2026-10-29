/* eslint-disable react/prop-types */
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Building2, ClipboardList, DoorOpen, FileText, Home, Users, Wrench, Zap } from 'lucide-react';
import AdminLogoutButton from './AdminLogoutButton';
import AdminUserProfile from './AdminUserProfile';
import { roleCanAccess } from '../utils/accessControl';
import { useBoardWorkspace } from './BoardLayout';
import DashboardNavLink from './DashboardNavLink';

const facilityMenuItems = [
  { to: '/facilities', label: 'Trang chủ', Icon: Home },
  { to: '/rooms', label: 'Quản lý phòng & CSVC', Icon: DoorOpen },
  { to: '/buildings', label: 'Danh mục tòa nhà', Icon: Building2 },
  { to: '/assets', label: 'Kho tài sản, thiết bị', Icon: Wrench },
  { to: '/meter-readings', label: 'Ghi chỉ số điện nước', Icon: Zap },
  { to: '/tickets', label: 'Yêu cầu sửa chữa', Icon: Wrench },
  { to: '/students', label: 'Hồ sơ sinh viên', Icon: Users },
  { to: '/contracts', label: 'Đăng ký & hợp đồng', Icon: FileText },
  { to: '/self-service', label: 'Yêu cầu lưu trú', Icon: ClipboardList },
];

const roleHeading = {
  BUILDING_MANAGER: 'Nhân viên quản lý CSVC tòa',
  FACILITIES_MANAGER: 'Nhân viên quản lý cơ sở vật chất',
  SECURITY: 'Nhân viên an ninh',
  MEDICAL_OFFICER: 'Cán bộ y tế',
  ACCOUNTANT: 'Nhân viên kế toán',
  SERVICE_PROVIDER: 'Nhà cung cấp dịch vụ',
  ADMIN: 'Quản trị viên',
};

const FacilitiesLayout = ({ children, title, description, actions, additionalMenuItems = [] }) => {
  const isBoardWorkspace = useBoardWorkspace();
  const role = useSelector((state) => state.auth.user?.role);
  const menuItems = [...facilityMenuItems, ...additionalMenuItems]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.to === item.to) === index)
    .filter(({ to }) => roleCanAccess(role, to));
  const homePath = menuItems[0]?.to || '/rooms';

  if (isBoardWorkspace) return <div className="flex min-h-0 flex-1 flex-col gap-5">
    {(description || actions) && <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      {description && <p className="text-sm text-slate-500">{description}</p>}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>}
    {children}
  </div>;

  return <div className="flex h-screen min-h-0 overflow-hidden bg-gray-50 font-sans text-gray-800">
    <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col bg-blue-950 text-white shadow-lg">
      <NavLink to={homePath} className="flex shrink-0 items-center gap-3 border-b border-blue-900 px-6 py-5" aria-label="Khu vực quản lý cơ sở vật chất">
        <Building2 className="h-8 w-8 text-blue-200" />
        <span className="min-w-0"><span className="block truncate text-lg font-bold tracking-wide">KTX · CSVC TÒA</span><span className="mt-0.5 block text-xs text-blue-300">Quản lý cơ sở vật chất</span></span>
      </NavLink>
      <nav aria-label="Nghiệp vụ cơ sở vật chất" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <DashboardNavLink />
        {menuItems.map(({ to, label, Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${isActive ? 'bg-blue-800 font-semibold text-white' : 'text-blue-200 hover:bg-blue-900 hover:text-white'}`}>
          <Icon className="h-5 w-5 shrink-0" /><span className="min-w-0 truncate">{label}</span>
        </NavLink>)}
      </nav>
      <div className="shrink-0 border-t border-blue-900 p-4"><AdminUserProfile /></div>
      <AdminLogoutButton />
    </aside>

    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-3 shadow-sm sm:px-8">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{roleHeading[role] || 'Nhân viên KTX'}</p><h1 className="mt-1 text-lg font-semibold sm:text-xl">{title}</h1>{description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}</div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 p-4 sm:p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
      </main>
    </div>
  </div>;
};

export default FacilitiesLayout;
