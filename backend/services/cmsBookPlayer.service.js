const { CmsBook, Media } = require('../models');
const { normalizeReadingFontSizePx } = require('../utils/cmsContentReading.util');

/**
 * Parent/teacher player for CmsBook (built-in book builder).
 * Linked from library Book records via Book.packageType === 'builtin' and Book.cmsBookId → same id used in getPlayableCmsBookForParent.
 */

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

function ensurePlayerAccess(userRole) {
  const allowedRoles = ['parent', 'admin', 'teacher'];
  if (!allowedRoles.includes(userRole)) {
    throw createHttpError('Only parent/admin/teacher can access book player', 403);
  }
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

function normalizeReadingForPlayer(reading = null) {
  if (!reading || typeof reading !== 'object') return null;
  const text = String(reading.text || '').trim();
  const durationSec = Number(reading.durationSec);
  const hasDuration = Number.isFinite(durationSec) && durationSec > 0;
  const fontSizePx = normalizeReadingFontSizePx(reading.fontSizePx);
  const normalized = {
    text: text || null,
    durationSec: hasDuration ? Number(durationSec.toFixed(3)) : null,
    fontSizePx,
    words: [],
  };

  if (Array.isArray(reading.words) && reading.words.length) {
    normalized.words = reading.words
      .map((word) => ({
        w: String(word?.w || '').trim(),
        start: Number(word?.start),
        end: Number(word?.end),
      }))
      .filter((word) => word.w && Number.isFinite(word.start) && Number.isFinite(word.end));
  } else if (normalized.text && normalized.durationSec) {
    normalized.words = buildWeightedWords(normalized.text, normalized.durationSec);
  }

  return normalized;
}

function toPlayerPage(page) {
  return {
    pageId: page.pageId,
    order: page.order,
    type: page.type,
    title: page.title || null,
    subtitle: page.subtitle || null,
    media: page.media || {},
    reading: normalizeReadingForPlayer(page.reading || null),
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

function toMediaView(media) {
  if (!media) return null;
  return {
    id: String(media._id),
    type: media.type || null,
    url: media.url || media.cloudUrl || null,
    mimeType: media.mimeType || null,
  };
}

function collectMediaIdsFromPages(pages = []) {
  const ids = new Set();
  pages.forEach((page) => {
    const media = page?.media || {};
    [
      media.imageMediaId,
      media.audioMediaId,
      media.videoMediaId,
      media.instructionAudioMediaId,
      media.backgroundImageMediaId,
      media.guideImageMediaId,
      ...(Array.isArray(media.guideImageMediaIds) ? media.guideImageMediaIds : []),
    ].forEach((id) => {
      if (id) ids.add(String(id));
    });

    const options = Array.isArray(page?.interaction?.options) ? page.interaction.options : [];
    options.forEach((option) => {
      if (option?.imageMediaId) ids.add(String(option.imageMediaId));
      if (option?.audioMediaId) ids.add(String(option.audioMediaId));
    });
  });
  return Array.from(ids);
}

function enrichPageMedia(page, mediaMap) {
  const base = toPlayerPage(page);
  const media = base.media || {};
  const resolveMedia = (id) => (id ? mediaMap.get(String(id)) || null : null);

  const interaction = base.interaction
    ? {
        ...base.interaction,
        options: (base.interaction.options || []).map((option) => ({
          ...option,
          imageMedia: resolveMedia(option.imageMediaId),
          audioMedia: resolveMedia(option.audioMediaId),
        })),
      }
    : null;

  return {
    ...base,
    media: {
      ...media,
      imageMedia: resolveMedia(media.imageMediaId),
      audioMedia: resolveMedia(media.audioMediaId),
      videoMedia: resolveMedia(media.videoMediaId),
      instructionAudioMedia: resolveMedia(media.instructionAudioMediaId),
      backgroundImageMedia: resolveMedia(media.backgroundImageMediaId),
      guideImageMedia: resolveMedia(media.guideImageMediaId),
      guideImageMedias: Array.isArray(media.guideImageMediaIds)
        ? media.guideImageMediaIds.map((id) => resolveMedia(id)).filter(Boolean)
        : [],
    },
    interaction,
  };
}

async function listPlayableCmsBooksForParent({
  userRole,
  page = 1,
  limit = 10,
  search = '',
  language,
} = {}) {
  ensurePlayerAccess(userRole);

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
      const introBackgroundMusicMediaId = coverPage?.media?.audioMediaId || null;
      return {
        id: String(book._id),
        title: book.title,
        description: book.description || null,
        language: book.language || 'en',
        version: book.version || 1,
        coverImageMediaId: coverPage?.media?.imageMediaId || null,
        introBackgroundMusicMediaId: introBackgroundMusicMediaId
          ? String(introBackgroundMusicMediaId)
          : null,
        totalPages: Array.isArray(book.pages) ? book.pages.length : 0,
        updatedAt: book.updatedAt,
      };
    }),
  };
}

async function getPlayableCmsBookForParent({ userRole, bookId }) {
  ensurePlayerAccess(userRole);
  if (!bookId) throw createHttpError('bookId is required', 400);

  const book = await CmsBook.findOne({
    _id: bookId,
    status: 'published',
    isArchived: false,
  }).lean();

  if (!book) throw createHttpError('Playable book not found', 404);

  const orderedPages = [...(book.pages || [])].sort((a, b) => a.order - b.order);
  const mediaIds = collectMediaIdsFromPages(orderedPages);
  const mediaDocs = mediaIds.length
    ? await Media.find({ _id: { $in: mediaIds }, isActive: true })
      .select('_id type url cloudUrl mimeType')
      .lean()
    : [];
  const mediaMap = new Map(mediaDocs.map((item) => [String(item._id), toMediaView(item)]));

  return {
    id: String(book._id),
    title: book.title,
    description: book.description || null,
    language: book.language || 'en',
    version: book.version || 1,
    pages: orderedPages.map((page) => enrichPageMedia(page, mediaMap)),
  };
}

module.exports = {
  listPlayableCmsBooksForParent,
  getPlayableCmsBookForParent,
};
