const financialReadRoles = ['ACCOUNTANT', 'TREASURER', 'BOARD_CHAIR', 'BOARD_DEPUTY', 'ADMIN'];

export const financialPermissions = {
  manage: ['ACCOUNTANT', 'TREASURER', 'ADMIN'],
};

export const rolePermissions = {
  '/': ['BOARD_CHAIR', 'BOARD_DEPUTY', 'ADMIN'],
  '/facilities': ['FACILITIES_MANAGER', 'BUILDING_MANAGER', 'ADMIN'],
  '/students': ['BOARD_CHAIR', 'BOARD_DEPUTY', 'ARCHIVIST', 'BUILDING_MANAGER', 'MEDICAL_OFFICER', 'ADMIN'],
  '/staff-accounts': ['BOARD_CHAIR', 'BOARD_DEPUTY', 'ADMIN'],
  '/rooms': ['BOARD_CHAIR', 'BOARD_DEPUTY', 'FACILITIES_MANAGER', 'BUILDING_MANAGER', 'ADMIN'],
  '/buildings': ['FACILITIES_MANAGER', 'BUILDING_MANAGER', 'ADMIN'],
  '/assets': ['FACILITIES_MANAGER', 'BUILDING_MANAGER', 'ADMIN'],
  '/meter-readings': ['FACILITIES_MANAGER', 'BUILDING_MANAGER', 'ADMIN'],
  '/contracts': ['BOARD_CHAIR', 'BOARD_DEPUTY', 'ARCHIVIST', 'BUILDING_MANAGER', 'ADMIN'],
  '/tickets': ['BOARD_CHAIR', 'BOARD_DEPUTY', 'FACILITIES_MANAGER', 'BUILDING_MANAGER', 'SERVICE_PROVIDER', 'ADMIN'],
  '/financial-dashboard': financialReadRoles,
  '/financial-dashboard/invoices': financialReadRoles,
  '/financial-dashboard/transactions': financialReadRoles,
  '/financial-dashboard/reconciliation': financialReadRoles,
  '/settings': ['ADMIN'],
  '/technician': ['FACILITIES_MANAGER', 'BUILDING_MANAGER', 'ADMIN'],
  '/student-portal': ['STUDENT', 'MILITARY_STUDENT'],
  '/my-room': ['STUDENT', 'MILITARY_STUDENT'],
  '/military-stay': ['STUDENT', 'MILITARY_STUDENT'],
  '/room-registration': ['STUDENT'],
  '/service-registration': ['STUDENT', 'MILITARY_STUDENT'],
  '/ticket-report': ['STUDENT', 'MILITARY_STUDENT'],
  '/bill-payment': ['STUDENT', 'MILITARY_STUDENT'],
  '/self-service': ['BOARD_CHAIR', 'BOARD_DEPUTY', 'BUILDING_MANAGER', 'SERVICE_PROVIDER', 'ADMIN'],
  '/security-medical': ['SECURITY', 'MEDICAL_OFFICER', 'ADMIN'],
  '/security': ['SECURITY', 'ADMIN'],
  '/security/visitors': ['SECURITY', 'ADMIN'],
  '/security/violations': ['SECURITY', 'ADMIN'],
  '/military-management': ['MILITARY_OFFICER', 'ADMIN'],
  '/archive-management': ['ARCHIVIST', 'ADMIN'],
};

export const studentRecordPermissions = {
  read: ['BOARD_CHAIR', 'BOARD_DEPUTY', 'ARCHIVIST', 'BUILDING_MANAGER', 'MEDICAL_OFFICER', 'ADMIN'],
  create: ['ARCHIVIST', 'ADMIN'],
  update: ['ARCHIVIST', 'ADMIN'],
  delete: ['ARCHIVIST', 'ADMIN'],
  sync: ['ARCHIVIST', 'ADMIN'],
};

export const housingRequestReadRoles = ['BOARD_CHAIR', 'BOARD_DEPUTY', 'ARCHIVIST', 'BUILDING_MANAGER', 'ADMIN'];
export const housingRequestDecisionRoles = {
  TRANSFER: ['ARCHIVIST', 'ADMIN'],
  RETURN: ['BUILDING_MANAGER', 'ADMIN'],
};

export const canDecideHousingRequest = (role, requestType) => housingRequestDecisionRoles[requestType]?.includes(role) || false;

export const homeForRole = (role) => ({
  STUDENT: '/student-portal',
  MILITARY_STUDENT: '/student-portal',
  BOARD_CHAIR: '/',
  BOARD_DEPUTY: '/',
  ARCHIVIST: '/archive-management',
  ACCOUNTANT: '/financial-dashboard',
  TREASURER: '/financial-dashboard',
  FACILITIES_MANAGER: '/facilities',
  BUILDING_MANAGER: '/facilities',
  SECURITY: '/security',
  MILITARY_OFFICER: '/military-management',
  MEDICAL_OFFICER: '/security-medical',
  SERVICE_PROVIDER: '/self-service',
  ADMIN: '/',
}[role] || '/login');

export const roleCanAccess = (role, path) => role === 'ADMIN' || rolePermissions[path]?.includes(role) || false;
