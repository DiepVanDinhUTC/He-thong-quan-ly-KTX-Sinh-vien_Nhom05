/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authApi } from '../services/authApi';
import { logout, userUpdated } from '../store/authSlice';
import { homeForRole } from '../utils/accessControl';

const RequireRole = ({ allowedRoles, children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const [loading, setLoading] = useState(!user && Boolean(token || localStorage.getItem('accessToken')));

  useEffect(() => {
    if (user) return undefined;
    if (!token && !localStorage.getItem('accessToken')) return undefined;
    let active = true;
    authApi.me().then((response) => {
      if (active) dispatch(userUpdated(response.user));
    }).catch(() => {
      if (!active) return;
      dispatch(logout());
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [dispatch, token, user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">Đang kiểm tra quyền truy cập...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;
  return children;
};

export default RequireRole;
