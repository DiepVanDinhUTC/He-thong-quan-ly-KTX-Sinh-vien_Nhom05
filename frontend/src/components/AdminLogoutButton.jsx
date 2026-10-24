/* eslint-disable react/prop-types */
import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { logout } from '../store/authSlice';

const AdminLogoutButton = ({ compactOnMobile = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <button
      type="button"
      title="Đăng xuất"
      aria-label="Đăng xuất"
      onClick={handleLogout}
      className={`mx-4 mb-4 mt-3 flex w-[calc(100%-2rem)] shrink-0 items-center gap-3 rounded-lg bg-red-600 py-3 text-left font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 ${compactOnMobile ? 'justify-center px-3 md:justify-start md:px-4' : 'px-4'}`}
    >
      <LogOut className="h-5 w-5 shrink-0" />
      <span className={compactOnMobile ? 'hidden md:inline' : undefined}>Đăng xuất</span>
    </button>
  );
};

export default AdminLogoutButton;
