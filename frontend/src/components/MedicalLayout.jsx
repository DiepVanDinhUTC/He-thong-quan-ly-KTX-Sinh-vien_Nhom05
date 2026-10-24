/* eslint-disable react/prop-types */
import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HeartPulse, Stethoscope, Users } from 'lucide-react';
import AdminLogoutButton from './AdminLogoutButton';
import AdminUserProfile from './AdminUserProfile';
import DashboardNavLink from './DashboardNavLink';

const menuItems = [
  { id: 'students', to: '/students', label: 'Hồ sơ sinh viên', Icon: Users },
  { id: 'health', to: '/security-medical?section=health', label: 'Hồ sơ sức khỏe', Icon: HeartPulse },
  { id: 'incidents', to: '/security-medical?section=incidents', label: 'Sự cố y tế & thuốc', Icon: Stethoscope },
];

const MedicalLayout = ({ title, actions, children }) => {
  const location = useLocation();
  const contentScrollRef = useRef(null);
  const activeSection = location.pathname === '/students'
    ? 'students'
    : new URLSearchParams(location.search).get('section') === 'incidents' ? 'incidents' : 'health';

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 });
  }, [activeSection]);

  return <div className="flex h-screen min-h-0 overflow-hidden bg-slate-50 font-sans text-slate-800">
    <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col bg-blue-950 text-white">
      <Link to="/security-medical?section=health" className="flex items-center gap-3 border-b border-blue-900 px-6 py-5">
        <HeartPulse className="h-8 w-8 shrink-0 text-blue-200" /><span className="text-lg font-bold tracking-wide">KTX · Y TẾ</span>
      </Link>
      <nav aria-label="Nghiệp vụ y tế" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <DashboardNavLink />
        {menuItems.map(({ id, to, label, Icon }) => <Link key={id} to={to} aria-current={activeSection === id ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${activeSection === id ? 'bg-blue-800 font-semibold text-white' : 'text-blue-200 hover:bg-blue-900 hover:text-white'}`}>
          <Icon className="h-5 w-5 shrink-0" />{label}
        </Link>)}
      </nav>
      <div className="shrink-0 border-t border-blue-900 p-4"><AdminUserProfile /></div>
      <AdminLogoutButton />
    </aside>

    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4 shadow-sm sm:px-8">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Cán bộ y tế</p><h1 className="mt-1 text-xl font-bold text-slate-900">{title}</h1></div>
        {actions}
      </header>
      <main ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 p-5 sm:p-8">{children}</div>
      </main>
    </div>
  </div>;
};

export const MedicalStat = ({ label, value, Icon, color = 'blue' }) => {
  const colors = { blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', violet: 'bg-violet-50 text-violet-700' };
  return <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors[color] || colors.blue}`}><Icon className="h-6 w-6" /></div>
    <div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>
  </div>;
};

export const MedicalPanel = ({ title, description, actions, children, noPadding = false }) => <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
    <div><h2 className="font-semibold text-slate-900">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>
    {actions}
  </div>
  <div className={noPadding ? '' : 'p-5'}>{children}</div>
</section>;

export default MedicalLayout;
