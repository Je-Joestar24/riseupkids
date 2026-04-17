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
    { path: 'missionShortVideo', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'rewardImage', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'rewardAudio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'rewardVideo', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'vocab.image', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'vocab.audio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'vocab.introAudio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'vocab.tryAgainAudio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'vocab.successAudio', select: 'type url title mimeType size duration isActive isPublished' },
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
  if (patch.missionShortVideo !== undefined) doc.missionShortVideo = ensureObjectId(patch.missionShortVideo, 'missionShortVideo');
  if (patch.rewardImage !== undefined) doc.rewardImage = ensureObjectId(patch.rewardImage, 'rewardImage');
  if (patch.rewardAudio !== undefined) doc.rewardAudio = ensureObjectId(patch.rewardAudio, 'rewardAudio');
  if (patch.rewardVideo !== undefined) doc.rewardVideo = ensureObjectId(patch.rewardVideo, 'rewardVideo');

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
      introAudio: ensureObjectId(v.introAudio, 'vocab.introAudio'),
      tryAgainAudio: ensureObjectId(v.tryAgainAudio, 'vocab.tryAgainAudio'),
      successAudio: ensureObjectId(v.successAudio, 'vocab.successAudio'),
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

function getMissionItemIndexBySortOrder(items, sortOrder) {
  const numericSortOrder = Number(sortOrder);
  if (!Number.isInteger(numericSortOrder) || numericSortOrder < 0) {
    const err = new Error('item sortOrder must be a non-negative integer');
    err.statusCode = 400;
    throw err;
  }
  const idx = (items || []).findIndex((it) => Number(it?.sortOrder) === numericSortOrder);
  if (idx < 0) {
    const err = new Error('Mission item not found');
    err.statusCode = 404;
    throw err;
  }
  return idx;
}

async function updateMissionItem({ id, userId, sortOrder, patch } = {}) {
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

  const idx = getMissionItemIndexBySortOrder(doc.items, sortOrder);
  const item = doc.items[idx];

  if (patch.target !== undefined) item.target = asTrimmedString(patch.target);
  if (patch.prompt !== undefined) item.prompt = asTrimmedString(patch.prompt);
  if (patch.success !== undefined) item.success = asTrimmedString(patch.success);
  if (patch.fail !== undefined) item.fail = asTrimmedString(patch.fail);

  doc.updatedBy = userId;
  await doc.save();

  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

async function deleteMissionItem({ id, userId, sortOrder } = {}) {
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
  if (doc.status === 'published') {
    const err = new Error('Published missions must keep exactly 7 items. Unpublish first.');
    err.statusCode = 400;
    throw err;
  }

  const idx = getMissionItemIndexBySortOrder(doc.items, sortOrder);
  doc.items.splice(idx, 1);
  doc.items = doc.items.map((item, index) => ({
    target: asTrimmedString(item.target),
    prompt: asTrimmedString(item.prompt),
    success: asTrimmedString(item.success),
    fail: asTrimmedString(item.fail),
    sortOrder: index,
  }));

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
  if (!doc.rewardAudio) {
    const err = new Error('rewardAudio is required before publishing');
    err.statusCode = 400;
    throw err;
  }
  if (!doc.missionShortVideo) {
    const err = new Error('missionShortVideo is required before publishing');
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
    assertMediaExists(doc.rewardAudio, { type: 'audio', fieldName: 'rewardAudio' }),
    doc.rewardVideo ? assertMediaExists(doc.rewardVideo, { type: 'video', fieldName: 'rewardVideo' }) : Promise.resolve(),
    assertMediaExists(doc.missionShortVideo, { type: 'video', fieldName: 'missionShortVideo' }),
    doc.introVideo ? assertMediaExists(doc.introVideo, { type: 'video', fieldName: 'introVideo' }) : Promise.resolve(),
    ...doc.vocab.flatMap((v, idx) => [
      assertMediaExists(v.image, { type: 'image', fieldName: `vocab[${idx}].image` }),
      assertMediaExists(v.audio, { type: 'audio', fieldName: `vocab[${idx}].audio` }),
      v.introAudio ? assertMediaExists(v.introAudio, { type: 'audio', fieldName: `vocab[${idx}].introAudio` }) : Promise.resolve(),
      assertMediaExists(v.tryAgainAudio, { type: 'audio', fieldName: `vocab[${idx}].tryAgainAudio` }),
      assertMediaExists(v.successAudio, { type: 'audio', fieldName: `vocab[${idx}].successAudio` }),
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
  introAudioFile,
  tryAgainAudioFile,
  successAudioFile,
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
  if (!tryAgainAudioFile) {
    const err = new Error('tryAgainAudio file is required');
    err.statusCode = 400;
    throw err;
  }
  if (!successAudioFile) {
    const err = new Error('successAudio file is required');
    err.statusCode = 400;
    throw err;
  }
  if ((doc.vocab || []).length >= 7) {
    const err = new Error('Mission already has 7 vocabulary entries');
    err.statusCode = 400;
    throw err;
  }

  const [
    { url: imageUrl, s3Key: imageS3Key },
    { url: audioUrl, s3Key: audioS3Key },
    { url: tryAgainAudioUrl, s3Key: tryAgainAudioS3Key },
    { url: successAudioUrl, s3Key: successAudioS3Key },
    pronunciationVideoUpload,
  ] = await Promise.all([
    s3Service.uploadFileFromMulter(imageFile, 'media/images'),
    s3Service.uploadFileFromMulter(audioFile, 'media/audio'),
    s3Service.uploadFileFromMulter(tryAgainAudioFile, 'media/audio'),
    s3Service.uploadFileFromMulter(successAudioFile, 'media/audio'),
    pronunciationVideoFile ? s3Service.uploadFileFromMulter(pronunciationVideoFile, 'media/videos') : Promise.resolve(null),
  ]);

  const [imageMedia, audioMedia, tryAgainAudioMedia, successAudioMedia, pronunciationVideoMedia] = await Promise.all([
    Media.create({
      type: 'image',
      title: imageFile.originalname,
      filePath: imageS3Key,
      url: imageUrl,
      mimeType: imageFile.mimetype,
      size: imageFile.size,
      uploadedBy: userId,
      isPublished: true,
    }),
    Media.create({
      type: 'audio',
      title: audioFile.originalname,
      filePath: audioS3Key,
      url: audioUrl,
      mimeType: audioFile.mimetype,
      size: audioFile.size,
      uploadedBy: userId,
      isPublished: true,
    }),
    Media.create({
      type: 'audio',
      title: tryAgainAudioFile.originalname,
      filePath: tryAgainAudioS3Key,
      url: tryAgainAudioUrl,
      mimeType: tryAgainAudioFile.mimetype,
      size: tryAgainAudioFile.size,
      uploadedBy: userId,
      isPublished: true,
    }),
    Media.create({
      type: 'audio',
      title: successAudioFile.originalname,
      filePath: successAudioS3Key,
      url: successAudioUrl,
      mimeType: successAudioFile.mimetype,
      size: successAudioFile.size,
      uploadedBy: userId,
      isPublished: true,
    }),
    pronunciationVideoUpload
      ? Media.create({
          type: 'video',
          title: pronunciationVideoFile.originalname,
          filePath: pronunciationVideoUpload.s3Key,
          url: pronunciationVideoUpload.url,
          mimeType: pronunciationVideoFile.mimetype,
          size: pronunciationVideoFile.size,
          uploadedBy: userId,
          isPublished: true,
        })
      : Promise.resolve(null),
  ]);

  let introAudioMedia = null;
  if (introAudioFile) {
    const { url: introAudioUrl, s3Key: introAudioS3Key } = await s3Service.uploadFileFromMulter(introAudioFile, 'media/audio');
    introAudioMedia = await Media.create({
      type: 'audio',
      title: introAudioFile.originalname,
      filePath: introAudioS3Key,
      url: introAudioUrl,
      mimeType: introAudioFile.mimetype,
      size: introAudioFile.size,
      uploadedBy: userId,
      isPublished: true,
    });
  }

  const nextSort = doc.vocab.length;
  doc.vocab.push({
    word: safeDisplay,
    displayText: safeDisplay,
    target: safeTarget,
    image: imageMedia._id,
    audio: audioMedia._id,
    introAudio: introAudioMedia ? introAudioMedia._id : null,
    tryAgainAudio: tryAgainAudioMedia._id,
    successAudio: successAudioMedia._id,
    pronunciationVideo: pronunciationVideoMedia?._id || null,
    sortOrder: nextSort,
  });
  doc.updatedBy = userId;
  await doc.save();

  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

function getMissionVocabIndexBySortOrder(vocabList, sortOrder) {
  const numericSortOrder = Number(sortOrder);
  if (!Number.isInteger(numericSortOrder) || numericSortOrder < 0) {
    const err = new Error('vocab sortOrder must be a non-negative integer');
    err.statusCode = 400;
    throw err;
  }
  const idx = (vocabList || []).findIndex((v) => Number(v?.sortOrder) === numericSortOrder);
  if (idx < 0) {
    const err = new Error('Mission vocabulary not found');
    err.statusCode = 404;
    throw err;
  }
  return idx;
}

async function uploadMediaAndCreateDoc(file, { folder, type, userId }) {
  const { url, s3Key } = await s3Service.uploadFileFromMulter(file, folder);
  return Media.create({
    type,
    title: file.originalname,
    filePath: s3Key,
    url,
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy: userId,
    isPublished: true,
  });
}

async function updateMissionVocabularyEntry({
  id,
  userId,
  sortOrder,
  displayText,
  target,
  imageFile,
  audioFile,
  introAudioFile,
  tryAgainAudioFile,
  successAudioFile,
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

  const idx = getMissionVocabIndexBySortOrder(doc.vocab, sortOrder);
  const entry = doc.vocab[idx];
  if (!entry) {
    const err = new Error('Mission vocabulary not found');
    err.statusCode = 404;
    throw err;
  }

  const hasTextPatch = displayText !== undefined || target !== undefined;
  const hasFilePatch = Boolean(imageFile || audioFile || introAudioFile || tryAgainAudioFile || successAudioFile || pronunciationVideoFile);
  if (!hasTextPatch && !hasFilePatch) {
    const err = new Error('No vocabulary updates provided');
    err.statusCode = 400;
    throw err;
  }

  if (displayText !== undefined) {
    const safeDisplay = asTrimmedString(displayText);
    if (!safeDisplay) {
      const err = new Error('displayText is required');
      err.statusCode = 400;
      throw err;
    }
    entry.displayText = safeDisplay;
    entry.word = safeDisplay;
  }
  if (target !== undefined) {
    const safeTarget = asTrimmedString(target)?.toLowerCase();
    if (!safeTarget) {
      const err = new Error('target is required');
      err.statusCode = 400;
      throw err;
    }
    entry.target = safeTarget;
  }

  const mediaTasks = [];
  if (imageFile) mediaTasks.push(uploadMediaAndCreateDoc(imageFile, { folder: 'media/images', type: 'image', userId }).then((m) => ({ key: 'image', id: m._id })));
  if (audioFile) mediaTasks.push(uploadMediaAndCreateDoc(audioFile, { folder: 'media/audio', type: 'audio', userId }).then((m) => ({ key: 'audio', id: m._id })));
  if (introAudioFile) mediaTasks.push(uploadMediaAndCreateDoc(introAudioFile, { folder: 'media/audio', type: 'audio', userId }).then((m) => ({ key: 'introAudio', id: m._id })));
  if (tryAgainAudioFile) mediaTasks.push(uploadMediaAndCreateDoc(tryAgainAudioFile, { folder: 'media/audio', type: 'audio', userId }).then((m) => ({ key: 'tryAgainAudio', id: m._id })));
  if (successAudioFile) mediaTasks.push(uploadMediaAndCreateDoc(successAudioFile, { folder: 'media/audio', type: 'audio', userId }).then((m) => ({ key: 'successAudio', id: m._id })));
  if (pronunciationVideoFile) {
    mediaTasks.push(
      uploadMediaAndCreateDoc(pronunciationVideoFile, { folder: 'media/videos', type: 'video', userId }).then((m) => ({
        key: 'pronunciationVideo',
        id: m._id,
      }))
    );
  }
  const uploadedMedia = await Promise.all(mediaTasks);
  uploadedMedia.forEach(({ key, id: mediaId }) => {
    entry[key] = mediaId;
  });

  doc.updatedBy = userId;
  await doc.save();

  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

async function deleteMissionVocabularyEntry({ id, userId, sortOrder } = {}) {
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
  if (doc.status === 'published') {
    const err = new Error('Published missions must keep exactly 7 vocabulary entries. Unpublish first.');
    err.statusCode = 400;
    throw err;
  }

  const idx = getMissionVocabIndexBySortOrder(doc.vocab, sortOrder);
  doc.vocab.splice(idx, 1);
  doc.vocab = doc.vocab.map((entry, index) => ({
    word: asTrimmedString(entry.word) || asTrimmedString(entry.displayText),
    displayText: asTrimmedString(entry.displayText) || asTrimmedString(entry.word),
    target: asTrimmedString(entry.target)?.toLowerCase(),
    image: entry.image || null,
    audio: entry.audio || null,
    introAudio: entry.introAudio || null,
    tryAgainAudio: entry.tryAgainAudio || null,
    successAudio: entry.successAudio || null,
    pronunciationVideo: entry.pronunciationVideo || null,
    sortOrder: index,
  }));

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

async function uploadMissionMedia({ id, userId, shortVideoFile, rewardAudioFile, rewardVideoFile } = {}) {
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
  if (!shortVideoFile && !rewardAudioFile && !rewardVideoFile) {
    const err = new Error('shortVideo, rewardAudio, or rewardVideo file is required');
    err.statusCode = 400;
    throw err;
  }

  const uploads = [];
  if (shortVideoFile) uploads.push(s3Service.uploadFileFromMulter(shortVideoFile, 'media/videos'));
  if (rewardAudioFile) uploads.push(s3Service.uploadFileFromMulter(rewardAudioFile, 'media/audio'));
  if (rewardVideoFile) uploads.push(s3Service.uploadFileFromMulter(rewardVideoFile, 'media/videos'));
  const uploaded = await Promise.all(uploads);
  let idx = 0;

  if (shortVideoFile) {
    const { url, s3Key } = uploaded[idx++];
    const shortVideoMedia = await Media.create({
      type: 'video',
      title: shortVideoFile.originalname,
      filePath: s3Key,
      url,
      mimeType: shortVideoFile.mimetype,
      size: shortVideoFile.size,
      uploadedBy: userId,
      isPublished: true,
    });
    doc.missionShortVideo = shortVideoMedia._id;
  }

  if (rewardAudioFile) {
    const { url, s3Key } = uploaded[idx++];
    const rewardAudioMedia = await Media.create({
      type: 'audio',
      title: rewardAudioFile.originalname,
      filePath: s3Key,
      url,
      mimeType: rewardAudioFile.mimetype,
      size: rewardAudioFile.size,
      uploadedBy: userId,
      isPublished: true,
    });
    doc.rewardAudio = rewardAudioMedia._id;
  }

  if (rewardVideoFile) {
    const { url, s3Key } = uploaded[idx++];
    const rewardVideoMedia = await Media.create({
      type: 'video',
      title: rewardVideoFile.originalname,
      filePath: s3Key,
      url,
      mimeType: rewardVideoFile.mimetype,
      size: rewardVideoFile.size,
      uploadedBy: userId,
      isPublished: true,
    });
    doc.rewardVideo = rewardVideoMedia._id;
  }

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
  updateMissionItem,
  deleteMissionItem,
  addMissionVocabularyEntry,
  updateMissionVocabularyEntry,
  deleteMissionVocabularyEntry,
  uploadMissionImage,
  uploadMissionMedia,
};

