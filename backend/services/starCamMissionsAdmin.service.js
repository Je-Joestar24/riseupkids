const mongoose = require('mongoose');
const { StarCamMission, Media } = require('../models');

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function asTrimmedString(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

function ensureObjectId(value, fieldName) {
  if (value == null || value === '') return null;
  const str = String(value).trim();
  if (!mongoose.Types.ObjectId.isValid(str)) {
    const err = new Error(`${fieldName} must be a valid id`);
    err.statusCode = 400;
    throw err;
  }
  return str;
}

function assertUniqueSortOrders(list, expectedLen, label) {
  if (!Array.isArray(list)) return;
  const orders = list.map((x) => x?.sortOrder).filter((x) => Number.isFinite(Number(x))).map((x) => Number(x));
  const uniq = new Set(orders);
  if (orders.length !== expectedLen || uniq.size !== expectedLen) {
    const err = new Error(`${label} must include sortOrder 0..${expectedLen - 1} exactly once`);
    err.statusCode = 400;
    throw err;
  }
  const min = Math.min(...orders);
  const max = Math.max(...orders);
  if (min !== 0 || max !== expectedLen - 1) {
    const err = new Error(`${label} must include sortOrder 0..${expectedLen - 1} exactly once`);
    err.statusCode = 400;
    throw err;
  }
}

async function assertMediaExists(mediaId, { type, fieldName }) {
  if (!mediaId) return;
  const media = await Media.findOne({ _id: mediaId, isActive: true }).select('_id type url').lean();
  if (!media) {
    const err = new Error(`${fieldName} not found`);
    err.statusCode = 404;
    throw err;
  }
  if (type && media.type !== type) {
    const err = new Error(`${fieldName} must be a ${type}`);
    err.statusCode = 400;
    throw err;
  }
}

function buildPopulate() {
  return [
    { path: 'introImage', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'introVideo', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'rewardImage', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'vocab.image', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'vocab.audio', select: 'type url title mimeType size duration isActive isPublished' },
  ];
}

async function listMissions({ page = 1, limit = 20, status, search } = {}) {
  const safePage = parsePositiveInt(page, 1);
  const safeLimit = Math.min(parsePositiveInt(limit, 20), 100);
  const skip = (safePage - 1) * safeLimit;

  const query = {};
  if (status && ['draft', 'published', 'archived'].includes(String(status))) query.status = String(status);

  const safeSearch = asTrimmedString(search);
  if (safeSearch) {
    query.$or = [{ title: { $regex: safeSearch, $options: 'i' } }, { missionId: { $regex: safeSearch, $options: 'i' } }];
  }

  const [total, items] = await Promise.all([
    StarCamMission.countDocuments(query),
    StarCamMission.find(query)
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(safeLimit)
      .select('missionId title status publishedAt updatedAt createdAt')
      .lean(),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      hasNextPage: safePage * safeLimit < total,
      hasPrevPage: safePage > 1,
    },
  };
}

async function createMission({ userId, missionId, title } = {}) {
  const mId = asTrimmedString(missionId);
  const t = asTrimmedString(title);
  if (!mId) throw new Error('missionId is required');
  if (!t) throw new Error('title is required');

  const doc = await StarCamMission.create({
    missionId: mId,
    title: t,
    status: 'draft',
    createdBy: userId,
    updatedBy: userId,
  });

  return doc.toObject();
}

async function getMissionById({ id }) {
  const doc = await StarCamMission.findById(id).populate(buildPopulate()).lean();
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }
  return doc;
}

async function updateMission({ id, userId, patch } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }

  if (doc.status === 'archived') {
    const err = new Error('Archived missions cannot be edited');
    err.statusCode = 400;
    throw err;
  }

  if (patch == null || typeof patch !== 'object') {
    const err = new Error('Invalid payload');
    err.statusCode = 400;
    throw err;
  }

  if (patch.title !== undefined) doc.title = asTrimmedString(patch.title) ?? doc.title;
  if (patch.introText !== undefined) doc.introText = asTrimmedString(patch.introText);
  if (patch.rewardTitle !== undefined) doc.rewardTitle = asTrimmedString(patch.rewardTitle) ?? doc.rewardTitle;
  if (patch.rewardSubtitle !== undefined) doc.rewardSubtitle = asTrimmedString(patch.rewardSubtitle) ?? doc.rewardSubtitle;

  if (patch.videoEnabled !== undefined) doc.videoEnabled = Boolean(patch.videoEnabled);

  if (patch.introImage !== undefined) doc.introImage = ensureObjectId(patch.introImage, 'introImage');
  if (patch.introVideo !== undefined) doc.introVideo = ensureObjectId(patch.introVideo, 'introVideo');
  if (patch.rewardImage !== undefined) doc.rewardImage = ensureObjectId(patch.rewardImage, 'rewardImage');

  if (patch.vocab !== undefined) {
    if (!Array.isArray(patch.vocab)) {
      const err = new Error('vocab must be an array');
      err.statusCode = 400;
      throw err;
    }
    doc.vocab = patch.vocab.map((v) => ({
      word: asTrimmedString(v.word),
      image: ensureObjectId(v.image, 'vocab.image'),
      audio: ensureObjectId(v.audio, 'vocab.audio'),
      sortOrder: Number(v.sortOrder),
    }));
  }

  if (patch.items !== undefined) {
    if (!Array.isArray(patch.items)) {
      const err = new Error('items must be an array');
      err.statusCode = 400;
      throw err;
    }
    doc.items = patch.items.map((it) => ({
      target: asTrimmedString(it.target),
      prompt: asTrimmedString(it.prompt),
      success: asTrimmedString(it.success),
      fail: asTrimmedString(it.fail),
      sortOrder: Number(it.sortOrder),
    }));
  }

  doc.updatedBy = userId;
  await doc.save();

  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

async function publishMission({ id, userId } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }
  if (doc.status === 'archived') {
    const err = new Error('Archived missions cannot be published');
    err.statusCode = 400;
    throw err;
  }

  // Enforce the "7 entries" constraint and stable ordering
  if (!Array.isArray(doc.vocab) || doc.vocab.length !== 7) {
    const err = new Error('Mission must have exactly 7 vocabulary entries before publishing');
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(doc.items) || doc.items.length !== 7) {
    const err = new Error('Mission must have exactly 7 scavenger hunt items before publishing');
    err.statusCode = 400;
    throw err;
  }
  assertUniqueSortOrders(doc.vocab, 7, 'vocab');
  assertUniqueSortOrders(doc.items, 7, 'items');

  if (!doc.introText || !String(doc.introText).trim()) {
    const err = new Error('introText is required before publishing');
    err.statusCode = 400;
    throw err;
  }
  if (!doc.introImage) {
    const err = new Error('introImage is required before publishing');
    err.statusCode = 400;
    throw err;
  }
  if (!doc.rewardImage) {
    const err = new Error('rewardImage is required before publishing');
    err.statusCode = 400;
    throw err;
  }
  if (doc.videoEnabled && !doc.introVideo) {
    const err = new Error('introVideo is required when videoEnabled is true');
    err.statusCode = 400;
    throw err;
  }

  // Validate referenced media exist and match types
  await Promise.all([
    assertMediaExists(doc.introImage, { type: 'image', fieldName: 'introImage' }),
    assertMediaExists(doc.rewardImage, { type: 'image', fieldName: 'rewardImage' }),
    doc.introVideo ? assertMediaExists(doc.introVideo, { type: 'video', fieldName: 'introVideo' }) : Promise.resolve(),
    ...doc.vocab.flatMap((v, idx) => [
      assertMediaExists(v.image, { type: 'image', fieldName: `vocab[${idx}].image` }),
      assertMediaExists(v.audio, { type: 'audio', fieldName: `vocab[${idx}].audio` }),
    ]),
  ]);

  doc.status = 'published';
  doc.updatedBy = userId;
  await doc.save();

  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

async function unpublishMission({ id, userId } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }
  if (doc.status === 'archived') {
    const err = new Error('Archived missions cannot be unpublished');
    err.statusCode = 400;
    throw err;
  }
  doc.status = 'draft';
  doc.updatedBy = userId;
  await doc.save();
  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

async function archiveMission({ id, userId } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }
  doc.status = 'archived';
  doc.updatedBy = userId;
  await doc.save();
  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

module.exports = {
  listMissions,
  createMission,
  getMissionById,
  updateMission,
  publishMission,
  unpublishMission,
  archiveMission,
};

