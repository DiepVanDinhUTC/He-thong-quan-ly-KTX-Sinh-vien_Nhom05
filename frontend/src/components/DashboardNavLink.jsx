/* eslint-disable react/prop-types */
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BarChart3 } from 'lucide-react';
import { roleCanAccess } from '../utils/accessControl';

const DashboardNavLink = ({ compactOnMobile = false }) => {
  const role = useSelector((state) => state.auth.user?.role);
  if (!roleCanAccess(role, '/')) return null;
  return <NavLink to="/" end title="Thống kê BQL" aria-label="Thống kê BQL" className={({ isActive }) => `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${compactOnMobile ? 'justify-center md:justify-start' : ''} ${isActive ? 'bg-blue-800 font-semibold text-white' : 'text-blue-200 hover:bg-blue-900 hover:text-white'}`}>
    <BarChart3 className="h-5 w-5 shrink-0" /><span className={compactOnMobile ? 'hidden md:block' : undefined}>Thống kê BQL</span>
  </NavLink>;
};

export default DashboardNavLink;
