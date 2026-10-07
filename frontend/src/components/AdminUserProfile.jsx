import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { authApi } from '../services/authApi';
import { logout, userUpdated } from '../store/authSlice';

const roleLabels = {
  MANAGER: 'Quản lý KTX',
  DIRECTOR: 'Giám đốc',
  ACCOUNTANT: 'Kế toán',
  TECHNICIAN: 'Kỹ thuật viên',
};

const AdminUserProfile = ({ variant = 'sidebar' }) => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (user || !localStorage.getItem('accessToken')) return undefined;

    let isMounted = true;
    authApi.me()
      .then((response) => {
        if (isMounted) dispatch(userUpdated(response.user));
      })
      .catch((error) => {
        if (isMounted && error.response?.status === 401) {
          dispatch(logout());
          navigate('/login', { replace: true });
        }
      });

    return () => { isMounted = false; };
  }, [dispatch, navigate, user]);

  const name = user?.hoTen || user?.username || 'Cán bộ quản lý';
  const role = user?.chucVu || roleLabels[user?.role] || 'Ban quản lý KTX';
  const staffId = user?.maNhanVien || null;

  if (variant === 'header') {
    return (
      <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
        <div className="hidden text-right md:block">
          <p className="text-sm font-bold leading-none text-gray-800">{name}</p>
          <p className="mt-1 text-xs font-medium text-gray-500">{staffId ? `${role} · ${staffId}` : role}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-100 text-blue-700 shadow-sm">
          <User className="h-5 w-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700">
        <User className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{name}</p>
        <p className="truncate text-xs text-blue-300">{staffId ? `${role} · ${staffId}` : role}</p>
      </div>
    </div>
  );
};

export default AdminUserProfile;
