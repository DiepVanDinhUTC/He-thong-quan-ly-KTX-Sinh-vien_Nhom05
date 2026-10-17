import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { logout } from '../store/authSlice';

const AdminLogoutButton = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="mx-4 mb-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-lg bg-red-600 px-4 py-3 text-left font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
    >
      <LogOut className="h-5 w-5" />
      <span>Đăng xuất</span>
    </button>
  );
};

export default AdminLogoutButton;
