/**
 * Content ownership helpers for content-creator shared-read UX.
 * Backend remains the source of truth for mutations.
 */

export const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  if (typeof value.toString === 'function') return value.toString();
  return null;
};

export const isContentOwnedByUser = (resource, user, ownerField = 'createdBy') => {
  if (!resource || !user) return false;
  const ownerValue = resource?.[ownerField] ?? resource?.createdBy ?? resource?.uploadedBy;
  const ownerId = toIdString(ownerValue);
  const userId = toIdString(user?._id ?? user?.id);
  return Boolean(ownerId && userId && ownerId === userId);
};

/**
 * Admins/teachers can manage all content.
 * Content creators can only manage content they created.
 */
export const canManageContent = (resource, user, ownerField = 'createdBy') => {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'teacher') return true;
  if (user.role === 'content_creator') {
    return isContentOwnedByUser(resource, user, ownerField);
  }
  return false;
};
