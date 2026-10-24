import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ClipboardList, DoorOpen, FileText, LayoutDashboard, RefreshCw, Shield, UserCog, Users, Wrench } from 'lucide-react';
import AdminLogoutButton from './AdminLogoutButton';
import AdminUserProfile from './AdminUserProfile';
import { roleCanAccess } from '../utils/accessControl';
import { financialSections } from '../utils/financialNavigation';

const BoardWorkspaceContext = createContext(false);
export const useBoardWorkspace = () => useContext(BoardWorkspaceContext);

const menuItems = [
  { to: '/', label: 'Tổng quan', Icon: LayoutDashboard },
  { to: '/students', label: 'Hồ sơ sinh viên', Icon: Users },
  { to: '/staff-accounts', label: 'Tài khoản nhân viên', Icon: UserCog },
  { to: '/rooms', label: 'Quản lý phòng & CSVC', Icon: DoorOpen },
  { to: '/contracts', label: 'Đăng ký & hợp đồng', Icon: FileText },
  ...financialSections,
  { to: '/tickets', label: 'Yêu cầu sửa chữa', Icon: Wrench },
  { to: '/self-service', label: 'Yêu cầu lưu trú', Icon: ClipboardList },
];

const BoardLayout = () => {
  const role = useSelector((state) => state.auth.user?.role);
  const location = useLocation();
  const contentScrollRef = useRef(null);
  const [contentVersion, setContentVersion] = useState(0);
  const isBoardLeader = ['BOARD_CHAIR', 'BOARD_DEPUTY'].includes(role);
  const visibleItems = menuItems.filter(({ to }) => roleCanAccess(role, to));
  const activeItem = visibleItems.find(({ to }) => to === location.pathname);

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  if (!isBoardLeader) return <Outlet />;

  return <BoardWorkspaceContext.Provider value={true}>
    <div className="flex h-screen min-h-0 overflow-hidden bg-slate-50 font-sans text-slate-800">
      <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col bg-blue-950 text-white">
        <Link to="/" className="flex items-center gap-3 border-b border-blue-900 px-6 py-5">
          <Shield className="h-8 w-8 shrink-0 text-blue-200" /><span className="text-lg font-bold tracking-wide">KTX · QUẢN LÝ</span>
        </Link>
        <nav aria-label="Nghiệp vụ ban quản lý KTX" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {visibleItems.map(({ to, label, Icon }) => <NavLink key={to} to={to} end className={({ isActive }) => `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${isActive ? 'bg-blue-800 font-semibold text-white' : 'text-blue-200 hover:bg-blue-900 hover:text-white'}`}>
            <Icon className="h-5 w-5 shrink-0" /><span>{label}</span>
          </NavLink>)}
        </nav>
        <div className="shrink-0 border-t border-blue-900 p-4"><AdminUserProfile /></div>
        <AdminLogoutButton />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4 shadow-sm sm:px-8">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{role === 'BOARD_CHAIR' ? 'Trưởng ban quản lý KTX' : 'Phó trưởng ban quản lý KTX'}</p><h1 className="mt-1 text-xl font-bold text-slate-900">{activeItem?.label || 'Ban quản lý ký túc xá'}</h1></div>
          <button type="button" onClick={() => setContentVersion((version) => version + 1)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Tải lại mục này</button>
        </header>
        <main ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div key={contentVersion} className="flex min-h-full flex-col gap-5 p-5 sm:p-8"><Outlet /></div>
        </main>
      </div>
    </div>
  </BoardWorkspaceContext.Provider>;
};

export default BoardLayout;
