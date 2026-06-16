const CONTENT_CREATOR_ROLE = 'content_creator';

class ContentOwnershipError extends Error {
  constructor(message = 'You are not authorized to access this content') {
    super(message);
    this.name = 'ContentOwnershipError';
    this.statusCode = 403;
  }
}

const isContentCreator = (user) => user?.role === CONTENT_CREATOR_ROLE;

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  if (typeof value.toString === 'function') return value.toString();
  return null;
};

/**
 * For list queries: scope content creators to their own documents.
 */
const applyCreatorOwnershipFilter = (user, baseQuery = {}) => {
  if (!isContentCreator(user)) {
    return { ...baseQuery };
  }

  return {
    ...baseQuery,
    createdBy: user._id,
  };
};

/**
 * Throws ContentOwnershipError when a content creator accesses another user's document.
 */
const assertCreatorOwnsDocument = (user, document, message) => {
  if (!isContentCreator(user)) {
    return;
  }

  if (!document) {
    throw new ContentOwnershipError('Content not found');
  }

  const ownerId = toIdString(document.createdBy);
  const userId = toIdString(user._id);

  if (!ownerId || !userId || ownerId !== userId) {
    throw new ContentOwnershipError(message || 'You can only manage content you created');
  }
};

/**
 * Map ownership errors to HTTP-friendly objects for controllers.
 */
const mapOwnershipError = (error, fallbackMessage) => {
  if (error instanceof ContentOwnershipError || error?.statusCode === 403) {
    return {
      statusCode: 403,
      message: error.message || fallbackMessage || 'Forbidden',
    };
  }

  return null;
};

module.exports = {
  CONTENT_CREATOR_ROLE,
  ContentOwnershipError,
  isContentCreator,
  applyCreatorOwnershipFilter,
  assertCreatorOwnsDocument,
  mapOwnershipError,
};
