import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  BedDouble,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard Overview', icon: <LayoutDashboard /> },
  { to: '/students', label: 'Quản lý Sinh viên', icon: <Users /> },
  { to: '/rooms', label: 'Quản lý Phòng & CSVC', icon: <BedDouble /> },
  { to: '/bills', label: 'Hóa đơn & Dịch vụ', icon: <CreditCard /> },
];

export default function AdminShell({
  children,
  headerStart,
  onNotice,
  userName,
  userRole,
  avatarAlt = 'Admin Avatar',
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const displayName = userName || user?.hoTen || 'Chưa đăng nhập';
  const displayRole = userRole || user?.role || 'Guest';

  const showNotice = (message) => {
    if (onNotice) onNotice(message);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-lg tracking-tight">
            <BedDouble className="w-6 h-6" />
            <span>UTC Dormitory</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}

          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={() => showNotice('Chức năng cài đặt hệ thống đang được phát triển.')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-blue-900"
            >
              <span className="text-slate-400">
                <Settings className="w-5 h-5" />
              </span>
              Cài đặt hệ thống
            </button>
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4 flex-1">{headerStart}</div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => showNotice('Bạn chưa có thông báo mới.')}
              className="relative p-2 text-slate-400 hover:text-blue-900 transition-colors rounded-full hover:bg-slate-100"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2" />
            <button
              type="button"
              onClick={() => showNotice(`Đang đăng nhập: ${displayName}`)}
              className="flex items-center gap-3 text-left"
            >
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&auto=format"
                alt={avatarAlt}
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
              <div className="hidden lg:block text-sm">
                <p className="font-medium text-slate-800">{displayName}</p>
                <p className="text-slate-500 text-xs">{displayRole}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-red-600 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
        isActive
          ? 'bg-blue-900 text-white shadow-md'
          : 'text-slate-600 hover:bg-slate-100 hover:text-blue-900'
      }`}
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? 'text-blue-200' : 'text-slate-400'}>
            {React.cloneElement(item.icon, { className: 'w-5 h-5' })}
          </span>
          {item.label}
        </>
      )}
    </NavLink>
  );
}
