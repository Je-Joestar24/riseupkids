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

function normalizeSearch(value) {
  return String(value || '').trim();
}

async function createCmsBook({ userId, payload }) {
  if (!userId) throw createHttpError('userId is required', 400);
  if (!payload || !payload.title || !String(payload.title).trim()) {
    throw createHttpError('Book title is required', 400);
  }

  const created = await CmsBook.create({
    ...payload,
    title: String(payload.title).trim(),
    createdBy: userId,
    updatedBy: userId,
  });

  return created;
}

async function listCmsBooks({ page = 1, limit = 10, search = '', status, language, includeArchived = false } = {}) {
  const safePage = parsePositiveInt(page, 1);
  const safeLimit = Math.min(parsePositiveInt(limit, 10), 100);
  const skip = (safePage - 1) * safeLimit;
  const safeSearch = normalizeSearch(search);

  const query = {};
  if (!includeArchived) query.isArchived = false;
  if (status) query.status = status;
  if (language) query.language = language;
  if (safeSearch) {
    query.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const total = await CmsBook.countDocuments(query);
  const items = await CmsBook.find(query)
    .sort({ updatedAt: -1, createdAt: -1 })
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
    items,
  };
}

async function getCmsBookById({ bookId, includeArchived = true }) {
  if (!bookId) throw createHttpError('bookId is required', 400);

  const query = { _id: bookId };
  if (!includeArchived) query.isArchived = false;

  const book = await CmsBook.findOne(query).lean();
  if (!book) throw createHttpError('Book not found', 404);
  return book;
}

async function updateCmsBook({ bookId, userId, patch }) {
  if (!bookId) throw createHttpError('bookId is required', 400);
  if (!userId) throw createHttpError('userId is required', 400);

  const book = await CmsBook.findById(bookId);
  if (!book || book.isArchived) throw createHttpError('Book not found', 404);
  if (book.status === 'published') {
    throw createHttpError('Unpublish book before editing content', 400);
  }

  const safePatch = { ...(patch || {}) };
  delete safePatch._id;
  delete safePatch.createdBy;
  delete safePatch.createdAt;
  delete safePatch.updatedAt;

  Object.assign(book, safePatch, { updatedBy: userId });
  await book.save();
  return book;
}

async function publishCmsBook({ bookId, userId }) {
  if (!bookId) throw createHttpError('bookId is required', 400);
  if (!userId) throw createHttpError('userId is required', 400);

  const book = await CmsBook.findById(bookId);
  if (!book || book.isArchived) throw createHttpError('Book not found', 404);

  book.status = 'published';
  book.updatedBy = userId;
  await book.save();
  return book;
}

async function unpublishCmsBook({ bookId, userId }) {
  if (!bookId) throw createHttpError('bookId is required', 400);
  if (!userId) throw createHttpError('userId is required', 400);

  const book = await CmsBook.findById(bookId);
  if (!book || book.isArchived) throw createHttpError('Book not found', 404);

  book.status = 'draft';
  book.updatedBy = userId;
  await book.save();
  return book;
}

async function archiveCmsBook({ bookId, userId }) {
  if (!bookId) throw createHttpError('bookId is required', 400);
  if (!userId) throw createHttpError('userId is required', 400);

  const book = await CmsBook.findById(bookId);
  if (!book) throw createHttpError('Book not found', 404);
  if (book.isArchived) throw createHttpError('Book is already archived', 400);

  book.isArchived = true;
  book.status = 'archived';
  book.updatedBy = userId;
  await book.save();
  return { id: String(book._id) };
}

module.exports = {
  createCmsBook,
  listCmsBooks,
  getCmsBookById,
  updateCmsBook,
  publishCmsBook,
  unpublishCmsBook,
  archiveCmsBook,
};
