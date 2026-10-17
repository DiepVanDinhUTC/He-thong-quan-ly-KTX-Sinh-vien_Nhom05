/* eslint-disable react/prop-types */
import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { rolePermissions } from '../utils/accessControl';

const RoleLink = ({ allowedRoles, ...props }) => {
  const role = useSelector((state) => state.auth.user?.role);
  const route = typeof props.to === 'string' ? props.to.split('#')[0] : '';
  const permittedRoles = allowedRoles || rolePermissions[route];
  if (permittedRoles && (!role || !permittedRoles.includes(role))) return null;
  return <Link {...props} />;
};

export default RoleLink;
