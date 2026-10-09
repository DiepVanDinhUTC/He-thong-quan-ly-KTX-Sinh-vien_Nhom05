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
    if (user) {
      setLoading(false);
      return undefined;
    }
    if (!token && !localStorage.getItem('accessToken')) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);

    const restoreSession = async () => {
      try {
        const response = await authApi.me();
        if (!active) return;
        // Stop the guard before updating Redux: that update can rerun this effect
        // and cancel its cleanup-sensitive state updates.
        setLoading(false);
        if (response?.user) dispatch(userUpdated(response.user));
        else dispatch(logout());
      } catch {
        if (!active) return;
        setLoading(false);
        dispatch(logout());
      }
    };

    restoreSession();
    return () => { active = false; };
  }, [dispatch, token, user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">Đang kiểm tra quyền truy cập...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;
  return children;
};

export default RequireRole;
