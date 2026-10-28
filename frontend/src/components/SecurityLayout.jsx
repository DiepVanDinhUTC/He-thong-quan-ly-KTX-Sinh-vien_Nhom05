/* eslint-disable react/prop-types */
import React, { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import AdminLogoutButton from './AdminLogoutButton';
import AdminUserProfile from './AdminUserProfile';
import { securitySections } from '../utils/securityNavigation';
import DashboardNavLink from './DashboardNavLink';

const SecurityLayout = ({ title, description, actions, children }) => {
  const location = useLocation();
  const contentScrollRef = useRef(null);

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return <div className="flex h-screen min-h-0 overflow-hidden bg-slate-50 font-sans text-slate-800">
    <aside className="flex h-full min-h-0 w-20 shrink-0 flex-col bg-blue-950 text-white md:w-72">
      <Link to="/security" aria-label="Trang chủ trật tự trị an" className="flex items-center justify-center gap-3 border-b border-blue-900 px-3 py-5 md:justify-start md:px-6">
        <ShieldCheck className="h-8 w-8 shrink-0 text-blue-200" />
        <span className="hidden md:block"><span className="block text-lg font-bold tracking-wide">KTX · TRỊ AN</span><span className="mt-0.5 block text-xs text-blue-300">Trật tự và an ninh nội trú</span></span>
      </Link>
      <nav aria-label="Nghiệp vụ trật tự trị an" className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-5">
        <DashboardNavLink compactOnMobile />
        {securitySections.map(({ to, label, Icon }) => <NavLink key={to} to={to} end title={label} aria-label={label} className={({ isActive }) => `flex items-center justify-center gap-3 rounded-lg px-3 py-3 text-sm transition md:justify-start ${isActive ? 'bg-blue-800 font-semibold text-white' : 'text-blue-200 hover:bg-blue-900 hover:text-white'}`}>
          <Icon className="h-5 w-5 shrink-0" /><span className="hidden md:block">{label}</span>
        </NavLink>)}
      </nav>
      <div className="hidden shrink-0 border-t border-blue-900 p-4 md:block"><AdminUserProfile /></div>
      <AdminLogoutButton compactOnMobile />
    </aside>
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-8">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Nhân viên trật tự trị an</p><h1 className="mt-1 text-xl font-bold text-slate-900">{title}</h1>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>
        {actions}
      </header>
      <main ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
      </main>
    </div>
  </div>;
};

export default SecurityLayout;
