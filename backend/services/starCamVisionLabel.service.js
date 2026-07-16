const mongoose = require('mongoose');
const { StarCamVisionLabel } = require('../models');
const { normalizeSearchKey, slugifyCustomLabelId } = require('../utils/oidLabelCsv.util');

const MIN_SEARCH_QUERY_LENGTH = 2;
const MAX_SEARCH_LIMIT = 50;
const DEFAULT_SEARCH_LIMIT = 20;
const MAX_DEFAULT_TERMS = 12;
const MAX_DISPLAY_NAME_LENGTH = 200;

function asTrimmed(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str || null;
}

function parseLimit(value, fallback = DEFAULT_SEARCH_LIMIT) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(MAX_SEARCH_LIMIT, n);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeDefaultTerms(terms, displayName) {
  const base = normalizeSearchKey(displayName);
  const set = new Set();
  if (base) set.add(base);
  for (const term of terms || []) {
    const normalized = normalizeSearchKey(term);
    if (normalized) set.add(normalized);
  }
  return Array.from(set).slice(0, MAX_DEFAULT_TERMS);
}

function toPublicLabel(doc) {
  if (!doc) return null;
  return {
    labelId: doc.labelId,
    displayName: doc.displayName,
    searchKey: doc.searchKey,
    source: doc.source,
    isChildFriendly: Boolean(doc.isChildFriendly),
    isAvailableForMissions: Boolean(doc.isAvailableForMissions),
    defaultTerms: Array.isArray(doc.defaultTerms) ? doc.defaultTerms : [],
    usageCount: typeof doc.usageCount === 'number' ? doc.usageCount : 0,
    updatedAt: doc.updatedAt || null,
  };
}

function scoreSearchMatch(doc, query) {
  const key = doc.searchKey || '';
  if (!key || !query) return 0;
  if (key === query) return 100;
  if (key.startsWith(query)) return 80;
  if (key.includes(query)) return 60;
  return 0;
}

function rankSearchResults(docs, query) {
  return docs
    .map((doc) => {
      let score = scoreSearchMatch(doc, query);
      if (doc.source === 'custom') score += 5;
      if (doc.isChildFriendly) score += 2;
      return { doc, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.doc.source !== b.doc.source) {
        return a.doc.source === 'custom' ? -1 : 1;
      }
      return String(a.doc.displayName).localeCompare(String(b.doc.displayName));
    })
    .map((entry) => entry.doc);
}

/**
 * @param {{ query?: string, limit?: number, childFriendlyOnly?: boolean, availableOnly?: boolean }} params
 */
async function searchLabels({ query, limit, childFriendlyOnly = false, availableOnly = true } = {}) {
  const safeQuery = normalizeSearchKey(query);
  const safeLimit = parseLimit(limit);

  if (!safeQuery || safeQuery.length < MIN_SEARCH_QUERY_LENGTH) {
    return { query: safeQuery || '', results: [] };
  }

  const filter = {
    isActive: true,
    searchKey: { $regex: escapeRegex(safeQuery), $options: 'i' },
  };
  if (childFriendlyOnly) filter.isChildFriendly = true;
  if (availableOnly) filter.isAvailableForMissions = true;

  const docs = await StarCamVisionLabel.find(filter)
    .select('labelId displayName searchKey source isChildFriendly isAvailableForMissions defaultTerms usageCount updatedAt')
    .limit(Math.min(200, safeLimit * 10))
    .lean();

  const ranked = rankSearchResults(docs, safeQuery).slice(0, safeLimit);
  return {
    query: safeQuery,
    results: ranked.map(toPublicLabel),
  };
}

/**
 * @param {{ limit?: number, availableOnly?: boolean }} params
 */
async function listRecentCustomLabels({ limit, availableOnly = true } = {}) {
  const safeLimit = parseLimit(limit);
  const filter = { isActive: true, source: 'custom' };
  if (availableOnly) filter.isAvailableForMissions = true;

  const docs = await StarCamVisionLabel.find(filter)
    .select('labelId displayName searchKey source isChildFriendly isAvailableForMissions defaultTerms usageCount updatedAt')
    .sort({ updatedAt: -1 })
    .limit(safeLimit)
    .lean();

  return { results: docs.map(toPublicLabel) };
}

async function getLabelByLabelId(labelId) {
  const safeId = asTrimmed(labelId);
  if (!safeId) return null;
  const doc = await StarCamVisionLabel.findOne({ labelId: safeId, isActive: true }).lean();
  return toPublicLabel(doc);
}

async function getLabelBySearchKey(searchKey) {
  const safeKey = normalizeSearchKey(searchKey);
  if (!safeKey) return null;
  const doc = await StarCamVisionLabel.findOne({ searchKey: safeKey, isActive: true }).lean();
  return toPublicLabel(doc);
}

/**
 * @param {{ displayName: string, defaultTerms?: string[], createdBy?: string }} params
 */
async function createCustomLabel({ displayName, defaultTerms, createdBy } = {}) {
  const safeDisplayName = asTrimmed(displayName);
  if (!safeDisplayName) {
    const err = new Error('displayName is required');
    err.statusCode = 400;
    throw err;
  }
  if (safeDisplayName.length > MAX_DISPLAY_NAME_LENGTH) {
    const err = new Error(`displayName cannot exceed ${MAX_DISPLAY_NAME_LENGTH} characters`);
    err.statusCode = 400;
    throw err;
  }

  const searchKey = normalizeSearchKey(safeDisplayName);
  if (!searchKey) {
    const err = new Error('displayName must contain at least one alphanumeric character');
    err.statusCode = 400;
    throw err;
  }

  const existing = await StarCamVisionLabel.findOne({ searchKey }).select('_id labelId source').lean();
  if (existing) {
    const err = new Error('A label with this name already exists');
    err.statusCode = 409;
    err.existingLabelId = existing.labelId;
    throw err;
  }

  let labelId = slugifyCustomLabelId(safeDisplayName);
  const labelIdTaken = await StarCamVisionLabel.findOne({ labelId }).select('_id').lean();
  if (labelIdTaken) {
    labelId = `${labelId}_${Date.now()}`;
  }

  const creatorId =
    createdBy && mongoose.Types.ObjectId.isValid(String(createdBy)) ? String(createdBy) : null;

  const doc = await StarCamVisionLabel.create({
    labelId,
    displayName: safeDisplayName,
    searchKey,
    source: 'custom',
    isChildFriendly: true,
    isActive: true,
    isAvailableForMissions: true,
    defaultTerms: normalizeDefaultTerms(defaultTerms, safeDisplayName),
    usageCount: 0,
    createdBy: creatorId,
    updatedBy: creatorId,
  });

  return toPublicLabel(doc.toObject());
}

async function incrementUsageCount(labelId, amount = 1) {
  const safeId = asTrimmed(labelId);
  if (!safeId) return null;
  const delta = Number.isFinite(Number(amount)) ? Math.max(1, Math.floor(Number(amount))) : 1;
  const doc = await StarCamVisionLabel.findOneAndUpdate(
    { labelId: safeId, isActive: true },
    { $inc: { usageCount: delta } },
    { new: true }
  ).lean();
  return toPublicLabel(doc);
}

function escapeAdminSearch(value) {
  return escapeRegex(String(value || '').trim());
}

/**
 * @param {{ page?: number, limit?: number, search?: string, availableOnly?: boolean }} params
 */
async function listLabelsForAdmin({ page = 1, limit = 25, search, availableOnly } = {}) {
  const safePage = Math.max(1, Number.parseInt(String(page ?? ''), 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(String(limit ?? ''), 10) || 25));
  const skip = (safePage - 1) * safeLimit;

  const filter = { isActive: true };
  const safeSearch = String(search || '').trim();
  if (safeSearch.length >= 2) {
    filter.searchKey = { $regex: escapeAdminSearch(safeSearch), $options: 'i' };
  }
  if (availableOnly === true) filter.isAvailableForMissions = true;
  if (availableOnly === false) filter.isAvailableForMissions = false;

  const [items, total] = await Promise.all([
    StarCamVisionLabel.find(filter)
      .select('labelId displayName searchKey source isChildFriendly isAvailableForMissions usageCount updatedAt')
      .sort({ isAvailableForMissions: -1, updatedAt: -1, displayName: 1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    StarCamVisionLabel.countDocuments(filter),
  ]);

  return {
    page: safePage,
    limit: safeLimit,
    total,
    items: items.map(toPublicLabel),
  };
}

async function setLabelAvailability({ labelId, isAvailableForMissions, updatedBy } = {}) {
  const safeId = asTrimmed(labelId);
  if (!safeId) {
    const err = new Error('labelId is required');
    err.statusCode = 400;
    throw err;
  }

  const creatorId =
    updatedBy && mongoose.Types.ObjectId.isValid(String(updatedBy)) ? String(updatedBy) : null;

  const doc = await StarCamVisionLabel.findOneAndUpdate(
    { labelId: safeId, isActive: true },
    {
      $set: {
        isAvailableForMissions: Boolean(isAvailableForMissions),
        ...(creatorId ? { updatedBy: creatorId } : {}),
      },
    },
    { new: true }
  ).lean();

  if (!doc) {
    const err = new Error('Label not found');
    err.statusCode = 404;
    throw err;
  }

  return toPublicLabel(doc);
}

/**
 * @param {{ labelIds?: string[], isAvailableForMissions: boolean, selectAllMatching?: boolean, search?: string, updatedBy?: string }} params
 */
async function bulkSetLabelAvailability({
  labelIds,
  isAvailableForMissions,
  selectAllMatching = false,
  search,
  updatedBy,
} = {}) {
  const creatorId =
    updatedBy && mongoose.Types.ObjectId.isValid(String(updatedBy)) ? String(updatedBy) : null;

  const filter = { isActive: true };
  if (selectAllMatching) {
    const safeSearch = String(search || '').trim();
    if (safeSearch.length >= 2) {
      filter.searchKey = { $regex: escapeAdminSearch(safeSearch), $options: 'i' };
    }
  } else {
    const ids = Array.isArray(labelIds) ? labelIds.map((id) => asTrimmed(id)).filter(Boolean) : [];
    if (!ids.length) {
      const err = new Error('labelIds is required unless selectAllMatching is true');
      err.statusCode = 400;
      throw err;
    }
    filter.labelId = { $in: ids };
  }

  const result = await StarCamVisionLabel.updateMany(filter, {
    $set: {
      isAvailableForMissions: Boolean(isAvailableForMissions),
      ...(creatorId ? { updatedBy: creatorId } : {}),
    },
  });

  return {
    matched: result.matchedCount || 0,
    modified: result.modifiedCount || 0,
    isAvailableForMissions: Boolean(isAvailableForMissions),
  };
}

module.exports = {
  MIN_SEARCH_QUERY_LENGTH,
  searchLabels,
  listRecentCustomLabels,
  listLabelsForAdmin,
  getLabelByLabelId,
  getLabelBySearchKey,
  createCustomLabel,
  incrementUsageCount,
  setLabelAvailability,
  bulkSetLabelAvailability,
  normalizeDefaultTerms,
  rankSearchResults,
  toPublicLabel,
};
