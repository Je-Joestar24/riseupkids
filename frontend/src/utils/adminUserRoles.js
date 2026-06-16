import { USER_ROLES } from '../config/constants';

export const ADMIN_USER_ROLE_OPTIONS = [
  { value: USER_ROLES.PARENT, label: 'Parent' },
  { value: USER_ROLES.TEACHER, label: 'Teacher' },
  { value: USER_ROLES.CONTENT_CREATOR, label: 'Content Creator' },
];

export const getAdminUserRoleLabel = (role) => {
  const match = ADMIN_USER_ROLE_OPTIONS.find((option) => option.value === role);
  if (match) return match.label;
  if (role === USER_ROLES.ADMIN) return 'Admin';
  return role || 'Unknown';
};

export const isParentRole = (role) => role === USER_ROLES.PARENT;
