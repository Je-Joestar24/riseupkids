const { CONTENT_CREATOR_ROLE } = require('../utils/contentOwnership');

const CONTENT_MANAGER_ROLES = ['admin', 'teacher', CONTENT_CREATOR_ROLE];

const canManageContent = (role) => CONTENT_MANAGER_ROLES.includes(role);

const assertContentManager = (user, message) => {
  if (!user || !canManageContent(user.role)) {
    const error = new Error(
      message || 'Only admins, teachers, and content creators can manage this content'
    );
    error.statusCode = 403;
    throw error;
  }
};

module.exports = {
  CONTENT_MANAGER_ROLES,
  CONTENT_CREATOR_ROLE,
  canManageContent,
  assertContentManager,
};
