const { CmsBook, Media } = require('../models');
const s3Service = require('./s3.service');
const { trimLeadingTrailingSilence } = require('../utils/audioSilenceTrim.util');

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

function normalizeTextTokens(text = '') {
  return String(text)
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildWeightedWords(text, durationSec) {
  const tokens = normalizeTextTokens(text);
  const duration = Number(durationSec);
  if (!tokens.length || !Number.isFinite(duration) || duration <= 0) return [];

  const weights = tokens.map((token) => Math.max(String(token).length, 1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!totalWeight) return [];

  let cursor = 0;
  return tokens.map((token, index) => {
    const raw = (weights[index] / totalWeight) * duration;
    const end = index === tokens.length - 1 ? duration : Math.min(duration, cursor + raw);
    const segment = {
      w: token,
      start: Number(cursor.toFixed(3)),
      end: Number(end.toFixed(3)),
    };
    cursor = end;
    return segment;
  });
}

function normalizeReadingWords({ words, durationSec }) {
  if (!Array.isArray(words) || words.length === 0) return [];
  const duration = Number(durationSec);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw createHttpError('reading.durationSec must be provided when reading.words is set', 400);
  }

  let previousEnd = 0;
  return words.map((word, index) => {
    const token = String(word?.w || '').trim();
    const start = Number(word?.start);
    const end = Number(word?.end);
    if (!token) throw createHttpError(`reading.words[${index}].w is required`, 400);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw createHttpError(`reading.words[${index}] start/end must be numbers`, 400);
    }
    if (start < 0 || end <= start || end > duration) {
      throw createHttpError(`reading.words[${index}] must satisfy 0 <= start < end <= durationSec`, 400);
    }
    if (index > 0 && start < previousEnd) {
      throw createHttpError(`reading.words[${index}] must be ordered by start`, 400);
    }
    previousEnd = end;
    return {
      w: token,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
    };
  });
}

function normalizeContentReading(page = {}) {
  if (page?.type !== 'content') return page;
  const next = { ...page };
  const reading = page?.reading ? { ...page.reading } : {};
  const text = String(reading.text || '').trim();
  const durationSec = reading.durationSec == null ? null : Number(reading.durationSec);
  const hasDuration = Number.isFinite(durationSec) && durationSec > 0;

  if (text) reading.text = text;
  else delete reading.text;

  if (hasDuration) reading.durationSec = Number(durationSec.toFixed(3));
  else delete reading.durationSec;

  if (Array.isArray(reading.words) && reading.words.length) {
    reading.words = normalizeReadingWords({ words: reading.words, durationSec: reading.durationSec });
  } else if (reading.text && hasDuration) {
    reading.words = buildWeightedWords(reading.text, reading.durationSec);
  } else {
    reading.words = [];
  }

  if (!reading.text && !reading.durationSec && reading.words.length === 0) {
    next.reading = null;
    return next;
  }

  next.reading = reading;
  return next;
}

function normalizePages(pages) {
  if (!Array.isArray(pages)) return pages;
  return pages.map((page) => normalizeContentReading(page));
}

function collectBookMediaIds(book) {
  const pages = Array.isArray(book?.pages) ? book.pages : [];
  const ids = new Set();

  const addId = (value) => {
    if (!value) return;
    ids.add(String(value));
  };

  pages.forEach((page) => {
    const media = page?.media || {};
    addId(media.imageMediaId);
    addId(media.audioMediaId);
    addId(media.videoMediaId);
    addId(media.instructionAudioMediaId);
    addId(media.backgroundImageMediaId);
    addId(media.guideImageMediaId);
    const guideImageMediaIds = Array.isArray(media.guideImageMediaIds) ? media.guideImageMediaIds : [];
    guideImageMediaIds.forEach(addId);

    const options = Array.isArray(page?.interaction?.options) ? page.interaction.options : [];
    options.forEach((option) => {
      addId(option?.imageMediaId);
      addId(option?.audioMediaId);
    });
  });

  return [...ids];
}

function getCoverPage(book) {
  const pages = Array.isArray(book?.pages) ? book.pages : [];
  return (
    pages.find((page) => page?.type === 'cover' && Number(page?.order) === 1) ||
    pages.find((page) => page?.type === 'cover') ||
    pages.find((page) => Number(page?.order) === 1) ||
    null
  );
}

function toMediaView(media) {
  if (!media) return null;
  return {
    id: String(media._id),
    _id: media._id,
    type: media.type || null,
    url: media.url || media.cloudUrl || null,
    cloudUrl: media.cloudUrl || null,
    mimeType: media.mimeType || null,
  };
}

async function attachCoverMediaToBooks(books = []) {
  const coverIds = books
    .map((book) => getCoverPage(book)?.media?.imageMediaId)
    .filter(Boolean)
    .map((id) => String(id));

  if (coverIds.length === 0) return books;

  const uniqueCoverIds = [...new Set(coverIds)];
  const mediaRecords = await Media.find({ _id: { $in: uniqueCoverIds }, isActive: true })
    .select('_id type url cloudUrl mimeType')
    .lean();
  const mediaById = new Map(mediaRecords.map((media) => [String(media._id), toMediaView(media)]));

  return books.map((book) => {
    const coverPage = getCoverPage(book);
    const coverMediaId = coverPage?.media?.imageMediaId ? String(coverPage.media.imageMediaId) : null;
    const coverMedia = coverMediaId ? mediaById.get(coverMediaId) || null : null;

    if (!coverMediaId) return book;

    const pages = Array.isArray(book?.pages)
      ? book.pages.map((page) => {
        const pageImageMediaId = page?.media?.imageMediaId ? String(page.media.imageMediaId) : null;
        const isCoverPage =
          pageImageMediaId === coverMediaId &&
          (page?.pageId === coverPage?.pageId || page?.type === 'cover' || Number(page?.order) === 1);

        if (!isCoverPage) return page;

        return {
          ...page,
          media: {
            ...(page.media || {}),
            imageMedia: coverMedia,
          },
        };
      })
      : book?.pages;

    return {
      ...book,
      pages,
      coverImageMediaId: coverMediaId,
      coverImageMedia: coverMedia,
      coverImageUrl: coverMedia?.url || null,
    };
  });
}

async function createCmsBook({ userId, payload }) {
  if (!userId) throw createHttpError('userId is required', 400);
  if (!payload || !payload.title || !String(payload.title).trim()) {
    throw createHttpError('Book title is required', 400);
  }

  const safePayload = { ...(payload || {}) };
  safePayload.pages = normalizePages(safePayload.pages);

  const created = await CmsBook.create({
    ...safePayload,
    title: String(payload.title).trim(),
    status: 'published',
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
  const itemsWithCoverMedia = await attachCoverMediaToBooks(items);

  return {
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasNextPage: safePage * safeLimit < total,
      hasPrevPage: safePage > 1,
    },
    items: itemsWithCoverMedia,
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

  const safePatch = { ...(patch || {}) };
  delete safePatch._id;
  delete safePatch.createdBy;
  delete safePatch.createdAt;
  delete safePatch.updatedAt;
  safePatch.pages = normalizePages(safePatch.pages);

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

async function deleteCmsBook({ bookId, userId }) {
  if (!bookId) throw createHttpError('bookId is required', 400);
  if (!userId) throw createHttpError('userId is required', 400);

  const book = await CmsBook.findById(bookId);
  if (!book) throw createHttpError('Book not found', 404);

  const serializedBook = typeof book.toObject === 'function' ? book.toObject() : book;
  const mediaIds = collectBookMediaIds(serializedBook);
  if (mediaIds.length > 0) {
    const mediaRecords = await Media.find({ _id: { $in: mediaIds } })
      .select('_id filePath cloudUrl url')
      .lean();

    await Promise.all(
      mediaRecords.map(async (media) => {
        const fallbackKey = media?.cloudUrl ? s3Service.getS3KeyFromUrl(media.cloudUrl) : null;
        const urlKey = !fallbackKey && media?.url ? s3Service.getS3KeyFromUrl(media.url) : null;
        const fileKey = media?.filePath || fallbackKey || urlKey;
        if (fileKey) {
          await s3Service.deleteByKey(fileKey).catch(() => null);
        }
      })
    );

    await Media.deleteMany({ _id: { $in: mediaRecords.map((media) => media._id) } });
  }

  await CmsBook.findByIdAndDelete(bookId);

  return { id: String(bookId), deletedMediaCount: mediaIds.length };
}

async function uploadCmsBookMedia({
  userId,
  file,
  mediaType,
  title,
  description,
}) {
  if (!userId) throw createHttpError('userId is required', 400);
  if (!file || !file.buffer) throw createHttpError('Media file is required', 400);

  const normalizedType = ['image', 'audio', 'video'].includes(String(mediaType || '').toLowerCase())
    ? String(mediaType).toLowerCase()
    : (file.mimetype?.startsWith('image/')
      ? 'image'
      : file.mimetype?.startsWith('audio/')
        ? 'audio'
        : file.mimetype?.startsWith('video/')
          ? 'video'
          : null);

  if (!normalizedType) {
    throw createHttpError('Invalid media type. Expected image/audio/video', 400);
  }

  const folder = normalizedType === 'image'
    ? 'media/images'
    : normalizedType === 'audio'
      ? 'media/audio'
      : 'media/videos';

  let uploadFile = file;
  let audioDurationSec = null;
  let trimMeta = null;

  if (normalizedType === 'audio') {
    const trimmed = await trimLeadingTrailingSilence(file);
    uploadFile = {
      ...file,
      buffer: trimmed.buffer,
      size: trimmed.size,
      mimetype: trimmed.mimetype,
    };
    audioDurationSec = trimmed.durationSec;
    trimMeta = trimmed.trimMeta;
  }

  const { url, s3Key } = await s3Service.uploadFileFromMulter(uploadFile, folder);
  const media = await Media.create({
    type: normalizedType,
    title: title?.trim() || file.originalname,
    description: description?.trim() || null,
    filePath: s3Key,
    cloudUrl: url,
    url,
    mimeType: uploadFile.mimetype,
    size: uploadFile.size,
    duration: audioDurationSec,
    uploadedBy: userId,
    isPublished: true,
  });

  const mediaObject = typeof media.toObject === 'function' ? media.toObject() : media;
  if (trimMeta) {
    return { ...mediaObject, trimMeta };
  }
  return mediaObject;
}

module.exports = {
  createCmsBook,
  listCmsBooks,
  getCmsBookById,
  updateCmsBook,
  publishCmsBook,
  unpublishCmsBook,
  archiveCmsBook,
  deleteCmsBook,
  uploadCmsBookMedia,
};
