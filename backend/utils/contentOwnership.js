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
 * Prefer applyCreatorSharedReadFilter when creators should also see others' published content.
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
 * For list/read queries: content creators see their own documents plus others' published (shared) documents.
 * Admins/teachers are unrestricted.
 *
 * @param {Object} user
 * @param {Object} [baseQuery]
 * @param {Object} [options]
 * @param {string} [options.publishedField='status']
 * @param {*} [options.publishedValue='published']
 * @param {string} [options.ownerField='createdBy']
 */
const applyCreatorSharedReadFilter = (user, baseQuery = {}, options = {}) => {
  if (!isContentCreator(user)) {
    return { ...baseQuery };
  }

  const {
    publishedField = 'status',
    publishedValue = 'published',
    ownerField = 'createdBy',
  } = options;

  const ownershipOr = [
    { [ownerField]: user._id },
    { [publishedField]: publishedValue },
  ];

  const { $or: existingOr, $and: existingAnd, ...rest } = baseQuery || {};
  const andClauses = [];

  if (Array.isArray(existingAnd) && existingAnd.length) {
    andClauses.push(...existingAnd);
  } else if (existingAnd) {
    andClauses.push(existingAnd);
  }

  if (existingOr) {
    andClauses.push({ $or: existingOr });
  }

  andClauses.push({ $or: ownershipOr });

  return {
    ...rest,
    $and: andClauses,
  };
};

const creatorOwnsDocument = (user, document, ownerField = 'createdBy') => {
  if (!document || !user) return false;
  const ownerId = toIdString(document[ownerField] ?? document.createdBy);
  const userId = toIdString(user._id);
  return Boolean(ownerId && userId && ownerId === userId);
};

const isDocumentPublishedShared = (document, options = {}) => {
  if (!document) return false;
  const { publishedField = 'status', publishedValue = 'published' } = options;
  const docValue = document[publishedField];
  if (publishedField === 'isPublished') {
    return Boolean(docValue) === Boolean(publishedValue);
  }
  return docValue === publishedValue;
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

  if (!creatorOwnsDocument(user, document)) {
    throw new ContentOwnershipError(message || 'You can only manage content you created');
  }
};

/**
 * Allows content creators to read their own content, or other creators' published/shared content.
 * Mutations must continue to use assertCreatorOwnsDocument.
 */
const assertCreatorCanReadDocument = (user, document, options = {}, message) => {
  if (!isContentCreator(user)) {
    return;
  }

  if (!document) {
    throw new ContentOwnershipError('Content not found');
  }

  const { ownerField = 'createdBy', ...publishedOptions } = options;

  if (creatorOwnsDocument(user, document, ownerField)) {
    return;
  }

  if (isDocumentPublishedShared(document, publishedOptions)) {
    return;
  }

  throw new ContentOwnershipError(
    message || 'You can only view published content created by other content creators'
  );
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
  toIdString,
  creatorOwnsDocument,
  applyCreatorOwnershipFilter,
  applyCreatorSharedReadFilter,
  assertCreatorOwnsDocument,
  assertCreatorCanReadDocument,
  mapOwnershipError,
};
