const { CmsBook } = require('../models');

function createHttpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function ensureParentAccess(userRole) {
  if (userRole !== 'parent') {
    throw createHttpError('Only parents can access book player', 403);
  }
}

function toPlayerPage(page) {
  return {
    pageId: page.pageId,
    order: page.order,
    type: page.type,
    title: page.title || null,
    subtitle: page.subtitle || null,
    media: page.media || {},
    interaction: page.interaction || null,
    navigation: page.navigation || {
      allowBack: true,
      allowNext: true,
      requireCompletionToNext: false,
    },
    scoring: page.scoring || {
      enabled: false,
      points: 0,
      awardMode: 'once_on_correct',
    },
  };
}

async function listPlayableCmsBooksForParent({
  userRole,
  page = 1,
  limit = 10,
  search = '',
  language,
} = {}) {
  ensureParentAccess(userRole);

  const safePage = parsePositiveInt(page, 1);
  const safeLimit = Math.min(parsePositiveInt(limit, 10), 100);
  const skip = (safePage - 1) * safeLimit;
  const safeSearch = String(search || '').trim();

  const query = { status: 'published', isArchived: false };
  if (language) query.language = language;
  if (safeSearch) {
    query.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const total = await CmsBook.countDocuments(query);
  const items = await CmsBook.find(query)
    .select('_id title description language version pages updatedAt')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(safeLimit)
    .lean();

  return {
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasNextPage: safePage * safeLimit < total,
      hasPrevPage: safePage > 1,
    },
    items: items.map((book) => {
      const coverPage = (book.pages || []).find((page) => page.type === 'cover' && page.order === 1) || null;
      return {
        id: String(book._id),
        title: book.title,
        description: book.description || null,
        language: book.language || 'en',
        version: book.version || 1,
        coverImageMediaId: coverPage?.media?.imageMediaId || null,
        totalPages: Array.isArray(book.pages) ? book.pages.length : 0,
        updatedAt: book.updatedAt,
      };
    }),
  };
}

async function getPlayableCmsBookForParent({ userRole, bookId }) {
  ensureParentAccess(userRole);
  if (!bookId) throw createHttpError('bookId is required', 400);

  const book = await CmsBook.findOne({
    _id: bookId,
    status: 'published',
    isArchived: false,
  }).lean();

  if (!book) throw createHttpError('Playable book not found', 404);

  const orderedPages = [...(book.pages || [])].sort((a, b) => a.order - b.order);
  return {
    id: String(book._id),
    title: book.title,
    description: book.description || null,
    language: book.language || 'en',
    version: book.version || 1,
    pages: orderedPages.map(toPlayerPage),
  };
}

module.exports = {
  listPlayableCmsBooksForParent,
  getPlayableCmsBookForParent,
};
