const mongoose = require('mongoose');
const { StarCamMission, Media, StarCamCategory } = require('../models');
const s3Service = require('./s3.service');

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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function generateMissionId({ title, categoryKey }) {
  const safeTitle = slugify(title).slice(0, 30);
  const safeCategory = slugify(categoryKey).slice(0, 20);
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const suffix = `${y}${m}${d}${h}${min}${s}`;
  const base = safeCategory || safeTitle || 'mission';
  return `${base}_${suffix}`;
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
    { path: 'category', select: 'key name description isActive sortOrder' },
    { path: 'missionImage', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'introImage', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'introVideo', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'rewardImage', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'vocab.image', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'vocab.audio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'vocab.pronunciationVideo', select: 'type url title mimeType size duration width height isActive isPublished' },
  ];
}

async function listMissions({ page = 1, limit = 20, status, search, categoryId } = {}) {
  const safePage = parsePositiveInt(page, 1);
  const safeLimit = Math.min(parsePositiveInt(limit, 20), 100);
  const skip = (safePage - 1) * safeLimit;

  const query = {};
  if (status && ['draft', 'published', 'archived'].includes(String(status))) query.status = String(status);
  const cId = ensureObjectId(categoryId, 'categoryId');
  if (cId) {
    query.category = cId;
  }

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
      .select('missionId title status category missionImage vocab publishedAt updatedAt createdAt')
      .populate({ path: 'category', select: 'key name sortOrder isActive' })
      .populate({ path: 'missionImage', select: 'url type width height' })
      .lean(),
  ]);

  const mappedItems = items.map((item) => ({
    ...item,
    vocabCount: Array.isArray(item.vocab) ? item.vocab.length : 0,
    missionImageUrl: item.missionImage?.url || null,
  }));

  return {
    items: mappedItems,
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

async function createMission({ userId, missionId, title, categoryId } = {}) {
  const mId = asTrimmedString(missionId);
  const t = asTrimmedString(title);
  const cId = ensureObjectId(categoryId, 'categoryId');
  if (!t) throw new Error('title is required');
  let categoryKey = null;
  if (cId) {
    const category = await StarCamCategory.findOne({ _id: cId, isActive: true }).select('_id key').lean();
    if (!category) {
      const err = new Error('categoryId not found');
      err.statusCode = 404;
      throw err;
    }
    categoryKey = category.key || null;
  }
  const finalMissionId = mId || generateMissionId({ title: t, categoryKey });

  const doc = await StarCamMission.create({
    missionId: finalMissionId,
    title: t,
    category: cId || null,
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
  if (patch.category !== undefined || patch.categoryId !== undefined) {
    const cId = ensureObjectId(patch.categoryId ?? patch.category, 'categoryId');
    if (cId) {
      const category = await StarCamCategory.findOne({ _id: cId, isActive: true }).select('_id').lean();
      if (!category) {
        const err = new Error('categoryId not found');
        err.statusCode = 404;
        throw err;
      }
    }
    doc.category = cId;
  }

  if (patch.missionImage !== undefined) doc.missionImage = ensureObjectId(patch.missionImage, 'missionImage');
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
      word: asTrimmedString(v.word) || asTrimmedString(v.displayText),
      displayText: asTrimmedString(v.displayText) || asTrimmedString(v.word),
      target: asTrimmedString(v.target)?.toLowerCase() || asTrimmedString(v.word)?.toLowerCase(),
      image: ensureObjectId(v.image, 'vocab.image'),
      audio: ensureObjectId(v.audio, 'vocab.audio'),
      pronunciationVideo: ensureObjectId(v.pronunciationVideo, 'vocab.pronunciationVideo'),
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
  for (let i = 0; i < doc.vocab.length; i += 1) {
    const v = doc.vocab[i];
    const displayText = asTrimmedString(v.displayText || v.word);
    const target = asTrimmedString(v.target);
    if (!displayText) {
      const err = new Error(`vocab[${i}].displayText is required before publishing`);
      err.statusCode = 400;
      throw err;
    }
    if (!target) {
      const err = new Error(`vocab[${i}].target is required before publishing`);
      err.statusCode = 400;
      throw err;
    }
  }

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
  if (!doc.category) {
    const err = new Error('category is required before publishing');
    err.statusCode = 400;
    throw err;
  }
  const category = await StarCamCategory.findOne({ _id: doc.category, isActive: true }).select('_id').lean();
  if (!category) {
    const err = new Error('category is not found or inactive');
    err.statusCode = 400;
    throw err;
  }

  // Validate referenced media exist and match types
  await Promise.all([
    assertMediaExists(doc.missionImage, { type: 'image', fieldName: 'missionImage' }),
    assertMediaExists(doc.introImage, { type: 'image', fieldName: 'introImage' }),
    assertMediaExists(doc.rewardImage, { type: 'image', fieldName: 'rewardImage' }),
    doc.introVideo ? assertMediaExists(doc.introVideo, { type: 'video', fieldName: 'introVideo' }) : Promise.resolve(),
    ...doc.vocab.flatMap((v, idx) => [
      assertMediaExists(v.image, { type: 'image', fieldName: `vocab[${idx}].image` }),
      assertMediaExists(v.audio, { type: 'audio', fieldName: `vocab[${idx}].audio` }),
      v.pronunciationVideo
        ? assertMediaExists(v.pronunciationVideo, { type: 'video', fieldName: `vocab[${idx}].pronunciationVideo` })
        : Promise.resolve(),
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

async function listCategories({ includeInactive = false } = {}) {
  const query = includeInactive ? {} : { isActive: true };
  const items = await StarCamCategory.find(query).sort({ sortOrder: 1, name: 1, _id: 1 }).lean();
  return { items };
}

async function createCategory({ key, name, description, sortOrder, isActive } = {}) {
  const categoryKey = asTrimmedString(key);
  const categoryName = asTrimmedString(name);
  if (!categoryKey) throw new Error('key is required');
  if (!categoryName) throw new Error('name is required');
  const data = await StarCamCategory.create({
    key: categoryKey,
    name: categoryName,
    description: asTrimmedString(description),
    sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    isActive: isActive == null ? true : Boolean(isActive),
  });
  return data.toObject();
}

async function addMissionVocabularyEntry({
  id,
  userId,
  displayText,
  target,
  imageFile,
  audioFile,
  pronunciationVideoFile,
} = {}) {
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

  const safeDisplay = asTrimmedString(displayText);
  const safeTarget = asTrimmedString(target)?.toLowerCase();
  if (!safeDisplay) {
    const err = new Error('displayText is required');
    err.statusCode = 400;
    throw err;
  }
  if (!safeTarget) {
    const err = new Error('target is required');
    err.statusCode = 400;
    throw err;
  }
  if (!imageFile) {
    const err = new Error('image file is required');
    err.statusCode = 400;
    throw err;
  }
  if (!audioFile) {
    const err = new Error('audio file is required');
    err.statusCode = 400;
    throw err;
  }
  if ((doc.vocab || []).length >= 7) {
    const err = new Error('Mission already has 7 vocabulary entries');
    err.statusCode = 400;
    throw err;
  }

  const uploads = await Promise.all([
    s3Service.uploadFileFromMulter(imageFile, 'media/images'),
    s3Service.uploadFileFromMulter(audioFile, 'media/audio'),
    pronunciationVideoFile ? s3Service.uploadFileFromMulter(pronunciationVideoFile, 'media/videos') : Promise.resolve(null),
  ]);
  const [imageUpload, audioUpload, videoUpload] = uploads;

  const [imageMedia, audioMedia, pronunciationVideoMedia] = await Promise.all([
    Media.create({
      type: 'image',
      title: imageFile.originalname,
      filePath: imageUpload.s3Key,
      url: imageUpload.url,
      mimeType: imageFile.mimetype,
      size: imageFile.size,
      uploadedBy: userId,
      isPublished: true,
    }),
    Media.create({
      type: 'audio',
      title: audioFile.originalname,
      filePath: audioUpload.s3Key,
      url: audioUpload.url,
      mimeType: audioFile.mimetype,
      size: audioFile.size,
      uploadedBy: userId,
      isPublished: true,
    }),
    videoUpload
      ? Media.create({
          type: 'video',
          title: pronunciationVideoFile.originalname,
          filePath: videoUpload.s3Key,
          url: videoUpload.url,
          mimeType: pronunciationVideoFile.mimetype,
          size: pronunciationVideoFile.size,
          uploadedBy: userId,
          isPublished: true,
        })
      : Promise.resolve(null),
  ]);

  const nextSort = doc.vocab.length;
  doc.vocab.push({
    word: safeDisplay,
    displayText: safeDisplay,
    target: safeTarget,
    image: imageMedia._id,
    audio: audioMedia._id,
    pronunciationVideo: pronunciationVideoMedia?._id || null,
    sortOrder: nextSort,
  });
  doc.updatedBy = userId;
  await doc.save();

  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

async function uploadMissionImage({ id, userId, imageFile } = {}) {
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
  if (!imageFile) {
    const err = new Error('image file is required');
    err.statusCode = 400;
    throw err;
  }

  const { url, s3Key } = await s3Service.uploadFileFromMulter(imageFile, 'media/images');
  const imageMedia = await Media.create({
    type: 'image',
    title: imageFile.originalname,
    filePath: s3Key,
    url,
    mimeType: imageFile.mimetype,
    size: imageFile.size,
    uploadedBy: userId,
    isPublished: true,
  });

  doc.missionImage = imageMedia._id;
  doc.updatedBy = userId;
  await doc.save();

  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

module.exports = {
  listMissions,
  listCategories,
  createCategory,
  createMission,
  getMissionById,
  updateMission,
  publishMission,
  unpublishMission,
  archiveMission,
  addMissionVocabularyEntry,
  uploadMissionImage,
};

