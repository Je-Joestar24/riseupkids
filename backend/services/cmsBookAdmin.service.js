const { CmsBook, Media } = require('../models');
const s3Service = require('./s3.service');
const { trimLeadingTrailingSilence } = require('../utils/audioSilenceTrim.util');
const { normalizeReadingFontSizePx } = require('../utils/cmsContentReading.util');
const { applyCreatorOwnershipFilter, assertCreatorOwnsDocument } = require('../utils/contentOwnership');

const CMS_BOOK_STATUSES = ['draft', 'published', 'archived'];

function createHttpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalizeBookStatus(value, { fallback = 'draft' } = {}) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'draft' || normalized === 'published') return normalized;
  if (normalized === 'archived') return 'archived';
  return fallback;
}

function rethrowAsHttpError(error, fallbackStatusCode = 400) {
  if (error && Number.isInteger(error.statusCode)) throw error;
  if (error?.name === 'ValidationError' || error?.message) {
    throw createHttpError(error.message || 'Validation failed', fallbackStatusCode);
  }
  throw error;
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

  const fontSizePx = normalizeReadingFontSizePx(reading.fontSizePx);
  if (fontSizePx != null) reading.fontSizePx = fontSizePx;
  else delete reading.fontSizePx;

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
    addId(media.sceneImageMediaId);
    const sceneImageMediaIds = Array.isArray(media.sceneImageMediaIds) ? media.sceneImageMediaIds : [];
    sceneImageMediaIds.forEach(addId);
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

function isSameCoverPage(page, coverPage) {
  if (!page || !coverPage) return false;
  if (coverPage.pageId && page.pageId === coverPage.pageId) return true;
  return page.type === 'cover' && Number(page.order) === Number(coverPage.order);
}

function toPlainBook(book) {
  if (!book) return book;
  return typeof book.toObject === 'function' ? book.toObject() : book;
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

function enrichPageMediaForAdmin(page, mediaById) {
  const media = page?.media || {};
  const resolveMedia = (id) => (id ? mediaById.get(String(id)) || null : null);

  const interaction = page?.interaction
    ? {
        ...page.interaction,
        options: (page.interaction.options || []).map((option) => ({
          ...option,
          imageMedia: resolveMedia(option.imageMediaId),
          audioMedia: resolveMedia(option.audioMediaId),
        })),
      }
    : null;

  return {
    ...page,
    media: {
      ...media,
      imageMedia: resolveMedia(media.imageMediaId),
      audioMedia: resolveMedia(media.audioMediaId),
      videoMedia: resolveMedia(media.videoMediaId),
      instructionAudioMedia: resolveMedia(media.instructionAudioMediaId),
      backgroundImageMedia: resolveMedia(media.backgroundImageMediaId),
      sceneImageMedia: resolveMedia(media.sceneImageMediaId),
      sceneImageMedias: Array.isArray(media.sceneImageMediaIds)
        ? media.sceneImageMediaIds.map((id) => resolveMedia(id)).filter(Boolean)
        : (media.sceneImageMediaId ? [resolveMedia(media.sceneImageMediaId)].filter(Boolean) : []),
      guideImageMedia: resolveMedia(media.guideImageMediaId),
      guideImageMedias: Array.isArray(media.guideImageMediaIds)
        ? media.guideImageMediaIds.map((id) => resolveMedia(id)).filter(Boolean)
        : [],
    },
    interaction,
  };
}

async function attachAllPagesMediaToBooks(books = []) {
  const mediaIds = new Set();
  books.forEach((book) => {
    collectBookMediaIds(book).forEach((id) => mediaIds.add(id));
  });

  if (!mediaIds.size) return books;

  const mediaRecords = await Media.find({ _id: { $in: [...mediaIds] }, isActive: true })
    .select('_id type url cloudUrl mimeType duration')
    .lean();
  const mediaById = new Map(mediaRecords.map((item) => [String(item._id), toMediaView(item)]));

  return books.map((book) => {
    const plain = toPlainBook(book);
    if (!Array.isArray(plain.pages) || !plain.pages.length) return plain;

    return {
      ...plain,
      pages: plain.pages.map((page) => enrichPageMediaForAdmin(page, mediaById)),
    };
  });
}

async function attachCoverPageMediaToBooks(books = []) {
  const coverMediaIds = new Set();
  books.forEach((book) => {
    const coverPage = getCoverPage(book);
    const media = coverPage?.media || {};
    if (media.imageMediaId) coverMediaIds.add(String(media.imageMediaId));
    if (media.audioMediaId) coverMediaIds.add(String(media.audioMediaId));
  });

  if (coverMediaIds.size === 0) return books;

  const mediaRecords = await Media.find({ _id: { $in: [...coverMediaIds] }, isActive: true })
    .select('_id type url cloudUrl mimeType')
    .lean();
  const mediaById = new Map(mediaRecords.map((media) => [String(media._id), toMediaView(media)]));

  return books.map((book) => {
    const coverPage = getCoverPage(book);
    if (!coverPage) return book;

    const coverImageMediaId = coverPage?.media?.imageMediaId ? String(coverPage.media.imageMediaId) : null;
    const introBackgroundMusicMediaId = coverPage?.media?.audioMediaId
      ? String(coverPage.media.audioMediaId)
      : null;
    const coverImageMedia = coverImageMediaId ? mediaById.get(coverImageMediaId) || null : null;
    const introBackgroundMusicMedia = introBackgroundMusicMediaId
      ? mediaById.get(introBackgroundMusicMediaId) || null
      : null;

    if (!coverImageMediaId && !introBackgroundMusicMediaId) return book;

    const pages = Array.isArray(book?.pages)
      ? book.pages.map((page) => {
        if (!isSameCoverPage(page, coverPage)) return page;

        const nextMedia = { ...(page.media || {}) };
        if (coverImageMedia) nextMedia.imageMedia = coverImageMedia;
        if (introBackgroundMusicMedia) nextMedia.audioMedia = introBackgroundMusicMedia;

        return {
          ...page,
          media: nextMedia,
        };
      })
      : book?.pages;

    return {
      ...book,
      pages,
      coverImageMediaId: coverImageMediaId || null,
      coverImageMedia: coverImageMedia || null,
      coverImageUrl: coverImageMedia?.url || null,
      introBackgroundMusicMediaId: introBackgroundMusicMediaId || null,
      introBackgroundMusicMedia: introBackgroundMusicMedia || null,
      introBackgroundMusicUrl: introBackgroundMusicMedia?.url || null,
    };
  });
}

async function enrichBookWithCoverPageMedia(book) {
  if (!book) return book;
  const [withPageMedia] = await attachAllPagesMediaToBooks([toPlainBook(book)]);
  const [enriched] = await attachCoverPageMediaToBooks([withPageMedia || toPlainBook(book)]);
  return enriched || book;
}

async function createCmsBook({ userId, payload }) {
  if (!userId) throw createHttpError('userId is required', 400);
  if (!payload || !payload.title || !String(payload.title).trim()) {
    throw createHttpError('Book title is required', 400);
  }

  const safePayload = { ...(payload || {}) };
  const status = normalizeBookStatus(safePayload.status, { fallback: 'draft' });
  delete safePayload.status;
  safePayload.pages = normalizePages(safePayload.pages);

  try {
    const created = await CmsBook.create({
      ...safePayload,
      title: String(payload.title).trim(),
      status,
      createdBy: userId,
      updatedBy: userId,
    });

    return enrichBookWithCoverPageMedia(created);
  } catch (error) {
    rethrowAsHttpError(error);
  }
}

async function listCmsBooks({ user, page = 1, limit = 10, search = '', status, language, includeArchived = false } = {}) {
  const safePage = parsePositiveInt(page, 1);
  const safeLimit = Math.min(parsePositiveInt(limit, 10), 100);
  const skip = (safePage - 1) * safeLimit;
  const safeSearch = normalizeSearch(search);

  const query = applyCreatorOwnershipFilter(user, {});
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
  const itemsWithCoverMedia = await attachCoverPageMediaToBooks(items);

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

async function getCmsBookById({ user, bookId, includeArchived = true }) {
  if (!bookId) throw createHttpError('bookId is required', 400);

  const query = applyCreatorOwnershipFilter(user, { _id: bookId });
  if (!includeArchived) query.isArchived = false;

  const book = await CmsBook.findOne(query).lean();
  if (!book) throw createHttpError('Book not found', 404);
  return enrichBookWithCoverPageMedia(book);
}

async function updateCmsBook({ user, bookId, userId, patch }) {
  if (!bookId) throw createHttpError('bookId is required', 400);
  if (!userId) throw createHttpError('userId is required', 400);

  const book = await CmsBook.findById(bookId);
  if (!book || book.isArchived) throw createHttpError('Book not found', 404);
  assertCreatorOwnsDocument(user, book);

  const safePatch = { ...(patch || {}) };
  delete safePatch._id;
  delete safePatch.createdBy;
  delete safePatch.createdAt;
  delete safePatch.updatedAt;
  delete safePatch.isArchived;

  if (safePatch.status === 'published') {
    throw createHttpError('Use PATCH /admin/cms-books/:id/publish to publish a book', 400);
  }
  if (safePatch.status != null) {
    const nextStatus = normalizeBookStatus(safePatch.status, { fallback: book.status || 'draft' });
    if (nextStatus === 'archived') {
      throw createHttpError('Use PATCH /admin/cms-books/:id/archive to archive a book', 400);
    }
    safePatch.status = nextStatus;
  }

  safePatch.pages = normalizePages(safePatch.pages);

  Object.assign(book, safePatch, { updatedBy: userId });

  try {
    await book.save();
    return enrichBookWithCoverPageMedia(book);
  } catch (error) {
    rethrowAsHttpError(error);
  }
}

async function publishCmsBook({ user, bookId, userId }) {
  if (!bookId) throw createHttpError('bookId is required', 400);
  if (!userId) throw createHttpError('userId is required', 400);

  const book = await CmsBook.findById(bookId);
  if (!book || book.isArchived) throw createHttpError('Book not found', 404);
  assertCreatorOwnsDocument(user, book);
  if (book.status === 'archived') {
    throw createHttpError('Archived books cannot be published', 400);
  }

  book.status = 'published';
  book.updatedBy = userId;

  try {
    await book.save();
    return enrichBookWithCoverPageMedia(book);
  } catch (error) {
    rethrowAsHttpError(error);
  }
}

async function unpublishCmsBook({ user, bookId, userId }) {
  if (!bookId) throw createHttpError('bookId is required', 400);
  if (!userId) throw createHttpError('userId is required', 400);

  const book = await CmsBook.findById(bookId);
  if (!book || book.isArchived) throw createHttpError('Book not found', 404);
  assertCreatorOwnsDocument(user, book);

  book.status = 'draft';
  book.updatedBy = userId;

  try {
    await book.save();
    return enrichBookWithCoverPageMedia(book);
  } catch (error) {
    rethrowAsHttpError(error);
  }
}

async function archiveCmsBook({ user, bookId, userId }) {
  if (!bookId) throw createHttpError('bookId is required', 400);
  if (!userId) throw createHttpError('userId is required', 400);

  const book = await CmsBook.findById(bookId);
  if (!book) throw createHttpError('Book not found', 404);
  assertCreatorOwnsDocument(user, book);
  if (book.isArchived) throw createHttpError('Book is already archived', 400);

  book.isArchived = true;
  book.status = 'archived';
  book.updatedBy = userId;
  await book.save();
  return { id: String(book._id) };
}

async function deleteCmsBook({ user, bookId, userId }) {
  if (!bookId) throw createHttpError('bookId is required', 400);
  if (!userId) throw createHttpError('userId is required', 400);

  const book = await CmsBook.findById(bookId);
  if (!book) throw createHttpError('Book not found', 404);
  assertCreatorOwnsDocument(user, book);

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
  CMS_BOOK_STATUSES,
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
