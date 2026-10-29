import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import FacilitiesLayout from '../components/FacilitiesLayout';
import FinancialLayout from '../components/FinancialLayout';
import StaffHomeContent from '../components/StaffHomeContent';

export const FinancialHome = () => {
  const role = useSelector((state) => state.auth.user?.role);
  if (!['ACCOUNTANT', 'TREASURER'].includes(role)) return <Navigate to="/financial-dashboard/invoices" replace />;
  return <FinancialLayout section={{ id: 'home', label: 'Trang chủ' }}><StaffHomeContent /></FinancialLayout>;
};

export const FacilitiesHome = () => {
  const role = useSelector((state) => state.auth.user?.role);
  return <FacilitiesLayout title="Trang chủ"><StaffHomeContent role={role === 'ADMIN' ? 'FACILITIES_MANAGER' : role} /></FacilitiesLayout>;
};
