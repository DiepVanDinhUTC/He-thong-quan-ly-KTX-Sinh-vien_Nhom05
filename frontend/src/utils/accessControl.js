export const rolePermissions = {
  '/': ['MANAGER', 'DIRECTOR'],
  '/students': ['MANAGER', 'DIRECTOR'],
  '/rooms': ['MANAGER', 'DIRECTOR'],
  '/contracts': ['MANAGER', 'DIRECTOR'],
  '/tickets': ['MANAGER', 'DIRECTOR'],
  '/financial-dashboard': ['ACCOUNTANT', 'DIRECTOR'],
  '/settings': ['DIRECTOR'],
  '/technician': ['TECHNICIAN', 'MANAGER'],
  '/student-portal': ['STUDENT'],
  '/my-room': ['STUDENT'],
  '/room-registration': ['STUDENT'],
  '/ticket-report': ['STUDENT'],
  '/bill-payment': ['STUDENT'],
};

export const homeForRole = (role) => ({
  STUDENT: '/student-portal',
  ACCOUNTANT: '/financial-dashboard',
  TECHNICIAN: '/technician',
  MANAGER: '/',
  DIRECTOR: '/',
}[role] || '/login');

export const roleCanAccess = (role, path) => rolePermissions[path]?.includes(role) || false;
