/* eslint-disable react/prop-types */
import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Home, WalletCards } from 'lucide-react';
import AdminLogoutButton from './AdminLogoutButton';
import AdminUserProfile from './AdminUserProfile';
import Sidebar from './Sidebar';
import { roleCanAccess } from '../utils/accessControl';
import { financialSections } from '../utils/financialNavigation';
import { useBoardWorkspace } from './BoardLayout';
import DashboardNavLink from './DashboardNavLink';

const roleHeadings = {
  ACCOUNTANT: 'Nhân viên kế toán',
  TREASURER: 'Nhân viên thủ quỹ',
  BOARD_CHAIR: 'Trưởng ban quản lý KTX',
  BOARD_DEPUTY: 'Phó trưởng ban quản lý KTX',
  ADMIN: 'Quản trị viên',
};

const FinancialLayout = ({ section, reviewCount, actions, children }) => {
  const isBoardWorkspace = useBoardWorkspace();
  const role = useSelector((state) => state.auth.user?.role);
  const contentScrollRef = useRef(null);
  const isFinanceStaff = ['ACCOUNTANT', 'TREASURER'].includes(role);

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 });
  }, [section.id]);

  if (isBoardWorkspace) return children;

  return <div className="flex h-screen min-h-0 overflow-hidden bg-slate-50 font-sans text-slate-800">
    {isFinanceStaff ? <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col bg-blue-950 text-white">
      <NavLink to="/financial-dashboard" className="flex items-center gap-3 border-b border-blue-900 px-6 py-5">
        <WalletCards className="h-8 w-8 shrink-0 text-blue-200" /><span className="text-lg font-bold tracking-wide">KTX · TÀI CHÍNH</span>
      </NavLink>
      <nav aria-label="Nghiệp vụ kế toán và thủ quỹ" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <DashboardNavLink />
        <NavLink to="/financial-dashboard" end className={({ isActive }) => `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${isActive ? 'bg-blue-800 font-semibold text-white' : 'text-blue-200 hover:bg-blue-900 hover:text-white'}`}><Home className="h-5 w-5 shrink-0" /><span>Trang chủ</span></NavLink>
        {financialSections.filter(({ to }) => roleCanAccess(role, to)).map(({ id, to, label, Icon }) => <NavLink key={id} to={to} className={({ isActive }) => `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${isActive ? 'bg-blue-800 font-semibold text-white' : 'text-blue-200 hover:bg-blue-900 hover:text-white'}`}>
          <Icon className="h-5 w-5 shrink-0" /><span>{label}</span>
          {id === 'transactions' && reviewCount > 0 && <span aria-label={`${reviewCount} giao dịch cần xác minh`} className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">{reviewCount}</span>}
        </NavLink>)}
      </nav>
      <div className="shrink-0 border-t border-blue-900 p-4"><AdminUserProfile /></div>
      <AdminLogoutButton />
    </aside> : <Sidebar />}

    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4 shadow-sm sm:px-8">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{roleHeadings[role] || 'Tài chính KTX'}</p><h1 className="mt-1 text-xl font-bold text-slate-900">{section.label}</h1></div>
        {actions}
      </header>
      <main ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 p-5 sm:p-8">{children}</div>
      </main>
    </div>
  </div>;
};

export default FinancialLayout;
