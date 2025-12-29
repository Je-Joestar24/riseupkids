// Utility helper functions

/**
 * Format date to readable string
 */
export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date and time
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Get user role display name
 */
export const getRoleDisplayName = (role) => {
  const roleMap = {
    admin: 'Admin',
    parent: 'Parent',
    child: 'Child',
  };
  return roleMap[role] || role;
};

/**
 * Check if user has required role
 */
export const hasRole = (userRole, requiredRole) => {
  return userRole === requiredRole;
};

