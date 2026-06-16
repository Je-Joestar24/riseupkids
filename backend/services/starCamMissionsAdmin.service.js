const mongoose = require('mongoose');
const { StarCamMission, Media, StarCamCategory } = require('../models');
const {
  isStarCamCategoryActiveDoc,
  isStarCamCategoryExplicitlyInactive,
} = require('../utils/starCamCategoryQuery');
const { trimLeadingTrailingSilence } = require('../utils/audioSilenceTrim.util');
const { applyCreatorOwnershipFilter, assertCreatorOwnsDocument } = require('../utils/contentOwnership');
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

function buildMissionItemPayload(item, sortOrderFallback) {
  const questionText = asTrimmedString(item.questionText) || asTrimmedString(item.prompt);
  const tryAgainText = asTrimmedString(item.tryAgainText) || asTrimmedString(item.fail);
  const successText = asTrimmedString(item.successText) || asTrimmedString(item.success);

  return {
    target: asTrimmedString(item.target),
    prompt: asTrimmedString(item.prompt) || questionText,
    success: asTrimmedString(item.success) || successText,
    fail: asTrimmedString(item.fail) || tryAgainText,
    questionText,
    questionAudio: ensureObjectId(item.questionAudio, 'item.questionAudio'),
    tryAgainText,
    tryAgainAudio: ensureObjectId(item.tryAgainAudio, 'item.tryAgainAudio'),
    successText,
    successAudio: ensureObjectId(item.successAudio, 'item.successAudio'),
    sortOrder: Number(item.sortOrder ?? sortOrderFallback),
  };
}

function normalizeTarget(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeTargetKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function findVocabForItem(vocabList, item) {
  const target = normalizeTarget(item?.target);
  if (!target) return null;
  const targetKey = normalizeTargetKey(target);
  return (
    (vocabList || []).find((v) => {
      const vocabTarget = normalizeTarget(v?.target);
      const vocabDisplay = normalizeTarget(v?.displayText);
      const vocabWord = normalizeTarget(v?.word);
      if (vocabTarget && vocabTarget === target) return true;
      const vocabTargetKey = normalizeTargetKey(vocabTarget);
      const vocabDisplayKey = normalizeTargetKey(vocabDisplay);
      const vocabWordKey = normalizeTargetKey(vocabWord);
      return Boolean(targetKey) && [vocabTargetKey, vocabDisplayKey, vocabWordKey].includes(targetKey);
    }) || null
  );
}

function getDefaultQuestionText(item, vocab) {
  const questionText = asTrimmedString(item?.questionText) || asTrimmedString(item?.prompt);
  if (questionText) return questionText;
  const label = asTrimmedString(vocab?.displayText) || asTrimmedString(vocab?.word) || asTrimmedString(item?.target);
  return label ? `Is this a ${label}?` : null;
}

function getItemQuestionAudio(item, vocab) {
  return item?.questionAudio || vocab?.introAudio || vocab?.audio || null;
}

function buildDefaultIntroText({ title } = {}) {
  const safeTitle = asTrimmedString(title) || 'this mission';
  return `Welcome to ${safeTitle}. Find all 7 objects and complete your Star Cam challenge!`;
}

function applyPublishDefaults(doc) {
  if (!asTrimmedString(doc.introText)) {
    doc.introText = buildDefaultIntroText({ title: doc.title });
  }
  // Match seeder behavior: reuse mission cover art when intro/reward images were not uploaded separately.
  if (!doc.introImage && doc.missionImage) {
    doc.introImage = doc.missionImage;
  }
  if (!doc.rewardImage && doc.missionImage) {
    doc.rewardImage = doc.missionImage;
  }
}

function buildDefaultMissionItemsFromVocab(vocabList = []) {
  return vocabList.map((vocab, index) => {
    const target = asTrimmedString(vocab?.target)?.toLowerCase() || '';
    const label = asTrimmedString(vocab?.displayText) || asTrimmedString(vocab?.word) || target || `item ${index + 1}`;
    return buildMissionItemPayload(
      {
        target,
        questionText: `Is this a ${label}?`,
        questionAudio: vocab?.introAudio || vocab?.audio || null,
        tryAgainText: `Ow that's not a ${label}, let's try again.`,
        tryAgainAudio: vocab?.tryAgainAudio || null,
        successText: `That's a ${label}, yeyy.`,
        successAudio: vocab?.successAudio || null,
        sortOrder: Number(vocab?.sortOrder ?? index),
      },
      index
    );
  });
}

function buildPopulate() {
  return [
    { path: 'category', select: 'key name description isActive sortOrder' },
    { path: 'missionImage', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'introImage', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'introVideo', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'missionShortVideo', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'missionIntroAudio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'rewardImage', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'rewardAudio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'rewardVideo', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'items.questionAudio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'items.tryAgainAudio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'items.successAudio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'vocab.image', select: 'type url title mimeType size duration width height isActive isPublished' },
    { path: 'vocab.audio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'vocab.introAudio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'vocab.tryAgainAudio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'vocab.successAudio', select: 'type url title mimeType size duration isActive isPublished' },
    { path: 'vocab.pronunciationVideo', select: 'type url title mimeType size duration width height isActive isPublished' },
  ];
}

async function listMissions({ user, page = 1, limit = 20, status, search, categoryId } = {}) {
  const safePage = parsePositiveInt(page, 1);
  const safeLimit = Math.min(parsePositiveInt(limit, 20), 100);
  const skip = (safePage - 1) * safeLimit;

  const query = applyCreatorOwnershipFilter(user, {});
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
    const category = await StarCamCategory.findById(cId).select('_id key isActive').lean();
    if (!category || isStarCamCategoryExplicitlyInactive(category)) {
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

async function getMissionById({ id, user } = {}) {
  const doc = await StarCamMission.findById(id).populate(buildPopulate()).lean();
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }
  assertCreatorOwnsDocument(user, doc);
  return doc;
}

async function updateMission({ id, user, userId, patch } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }

  assertCreatorOwnsDocument(user, doc);

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
      const category = await StarCamCategory.findById(cId).select('_id isActive').lean();
      if (!category || isStarCamCategoryExplicitlyInactive(category)) {
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
  if (patch.missionIntroAudio !== undefined) doc.missionIntroAudio = ensureObjectId(patch.missionIntroAudio, 'missionIntroAudio');
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
    doc.items = patch.items.map((it, index) => buildMissionItemPayload(it, index));
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

async function updateMissionItem({ id, user, userId, sortOrder, patch } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }

  assertCreatorOwnsDocument(user, doc);

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
  if (patch.prompt !== undefined) {
    item.prompt = asTrimmedString(patch.prompt);
    if (patch.questionText === undefined && !asTrimmedString(item.questionText)) item.questionText = item.prompt;
  }
  if (patch.success !== undefined) {
    item.success = asTrimmedString(patch.success);
    if (patch.successText === undefined && !asTrimmedString(item.successText)) item.successText = item.success;
  }
  if (patch.fail !== undefined) {
    item.fail = asTrimmedString(patch.fail);
    if (patch.tryAgainText === undefined && !asTrimmedString(item.tryAgainText)) item.tryAgainText = item.fail;
  }
  if (patch.questionText !== undefined) item.questionText = asTrimmedString(patch.questionText);
  if (patch.questionAudio !== undefined) item.questionAudio = ensureObjectId(patch.questionAudio, 'questionAudio');
  if (patch.tryAgainText !== undefined) item.tryAgainText = asTrimmedString(patch.tryAgainText);
  if (patch.tryAgainAudio !== undefined) item.tryAgainAudio = ensureObjectId(patch.tryAgainAudio, 'tryAgainAudio');
  if (patch.successText !== undefined) item.successText = asTrimmedString(patch.successText);
  if (patch.successAudio !== undefined) item.successAudio = ensureObjectId(patch.successAudio, 'successAudio');

  doc.updatedBy = userId;
  await doc.save();

  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

async function deleteMissionItem({ id, user, userId, sortOrder } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }

  assertCreatorOwnsDocument(user, doc);

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
    ...buildMissionItemPayload(item, index),
    sortOrder: index,
  }));

  doc.updatedBy = userId;
  await doc.save();

  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

async function publishMission({ id, user, userId } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }

  assertCreatorOwnsDocument(user, doc);

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
    // Backward compatibility: scan prompts/audio now come from vocab media.
    // If items are missing, synthesize 7 scan items from vocab on publish.
    if (Array.isArray(doc.vocab) && doc.vocab.length === 7 && (!Array.isArray(doc.items) || doc.items.length === 0)) {
      doc.items = buildDefaultMissionItemsFromVocab(doc.vocab);
    } else {
      const err = new Error('Mission must have exactly 7 scavenger hunt items before publishing');
      err.statusCode = 400;
      throw err;
    }
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
  for (let i = 0; i < doc.items.length; i += 1) {
    const item = doc.items[i];
    const matchingVocab = findVocabForItem(doc.vocab, item);
    if (!asTrimmedString(item.target)) {
      const err = new Error(`items[${i}].target is required before publishing`);
      err.statusCode = 400;
      throw err;
    }
    if (!matchingVocab) {
      const err = new Error(`items[${i}].target must match a vocabulary target before publishing`);
      err.statusCode = 400;
      throw err;
    }
    if (!getDefaultQuestionText(item, matchingVocab)) {
      const err = new Error(`items[${i}].questionText is required before publishing`);
      err.statusCode = 400;
      throw err;
    }
    if (!getItemQuestionAudio(item, matchingVocab)) {
      const err = new Error(`items[${i}].questionAudio is required before publishing`);
      err.statusCode = 400;
      throw err;
    }
    if (!asTrimmedString(item.tryAgainText || item.fail)) {
      const err = new Error(`items[${i}].tryAgainText is required before publishing`);
      err.statusCode = 400;
      throw err;
    }
    if (!(item.tryAgainAudio || matchingVocab.tryAgainAudio)) {
      const err = new Error(`items[${i}].tryAgainAudio is required before publishing`);
      err.statusCode = 400;
      throw err;
    }
    if (!asTrimmedString(item.successText || item.success)) {
      const err = new Error(`items[${i}].successText is required before publishing`);
      err.statusCode = 400;
      throw err;
    }
    if (!(item.successAudio || matchingVocab.successAudio)) {
      const err = new Error(`items[${i}].successAudio is required before publishing`);
      err.statusCode = 400;
      throw err;
    }
  }

  if (!doc.category) {
    const err = new Error('category is required before publishing');
    err.statusCode = 400;
    throw err;
  }
  const category = await StarCamCategory.findById(doc.category).select('_id name isActive').lean();
  if (!category || isStarCamCategoryExplicitlyInactive(category)) {
    const err = new Error('category is not found or inactive');
    err.statusCode = 400;
    throw err;
  }

  applyPublishDefaults(doc);

  if (!asTrimmedString(doc.introText)) {
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
    ...doc.items.flatMap((item, idx) => [
      item.questionAudio ? assertMediaExists(item.questionAudio, { type: 'audio', fieldName: `items[${idx}].questionAudio` }) : Promise.resolve(),
      item.tryAgainAudio ? assertMediaExists(item.tryAgainAudio, { type: 'audio', fieldName: `items[${idx}].tryAgainAudio` }) : Promise.resolve(),
      item.successAudio ? assertMediaExists(item.successAudio, { type: 'audio', fieldName: `items[${idx}].successAudio` }) : Promise.resolve(),
    ]),
  ]);

  doc.status = 'published';
  doc.updatedBy = userId;
  await doc.save();

  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

async function unpublishMission({ id, user, userId } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }

  assertCreatorOwnsDocument(user, doc);

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

async function archiveMission({ id, user, userId } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }

  assertCreatorOwnsDocument(user, doc);

  doc.status = 'archived';
  doc.updatedBy = userId;
  await doc.save();
  return StarCamMission.findById(doc._id).populate(buildPopulate()).lean();
}

async function listCategories({ includeInactive = false } = {}) {
  const collName = StarCamCategory.collection?.name || 'starcamcategories';
  const sortSpec = { sortOrder: 1, name: 1, _id: 1 };

  let all = await StarCamCategory.find({}).sort(sortSpec).lean();

  // Same collection via native driver (rules out rare Mongoose middleware / query oddities)
  if (all.length === 0 && mongoose.connection.db && StarCamCategory.collection) {
    const raw = await mongoose.connection.db.collection(collName).find({}).sort(sortSpec).toArray();
    if (raw.length) {
      console.warn('[StarCam][listCategories] Mongoose find was empty but native driver returned rows; using native.', {
        collection: collName,
        count: raw.length,
      });
      all = raw;
    }
  }

  const items = includeInactive ? all : all.filter((doc) => isStarCamCategoryActiveDoc(doc));

  if (items.length === 0) {
    const dbName = mongoose.connection.db?.databaseName;
    if (all.length === 0) {
      let relatedCollections = [];
      if (mongoose.connection.db) {
        relatedCollections = (await mongoose.connection.db.listCollections().toArray())
          .map((c) => c.name)
          .filter((n) => /categor|starcam|star_cam/i.test(n))
          .sort();
      }
      console.warn('[StarCam][listCategories] No category documents in model collection.', {
        db: dbName,
        modelCollection: collName,
        hint:
          'Confirm Compass uses the same database as MONGODB_URI. If categories live under another collection name, set STARCAM_CATEGORY_COLLECTION to that exact name and restart the API.',
        relatedCollections,
      });
    } else {
      console.warn('[StarCam][listCategories] All rows treated as inactive after filter.', {
        db: dbName,
        collection: collName,
        totalDocs: all.length,
        sampleIsActive: all[0]?.isActive,
        sampleIsActiveType: all[0] ? typeof all[0].isActive : 'n/a',
      });
    }
  }

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
  user,
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

  assertCreatorOwnsDocument(user, doc);

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

  const [preparedAudio, preparedIntroAudio, preparedTryAgainAudio, preparedSuccessAudio] = await Promise.all([
    prepareAudioMulterFile(audioFile),
    introAudioFile ? prepareAudioMulterFile(introAudioFile) : Promise.resolve({ file: null, durationSec: null }),
    prepareAudioMulterFile(tryAgainAudioFile),
    prepareAudioMulterFile(successAudioFile),
  ]);

  const [
    { url: imageUrl, s3Key: imageS3Key },
    { url: audioUrl, s3Key: audioS3Key },
    { url: tryAgainAudioUrl, s3Key: tryAgainAudioS3Key },
    { url: successAudioUrl, s3Key: successAudioS3Key },
    pronunciationVideoUpload,
  ] = await Promise.all([
    s3Service.uploadFileFromMulter(imageFile, 'media/images'),
    s3Service.uploadFileFromMulter(preparedAudio.file, 'media/audio'),
    s3Service.uploadFileFromMulter(preparedTryAgainAudio.file, 'media/audio'),
    s3Service.uploadFileFromMulter(preparedSuccessAudio.file, 'media/audio'),
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
      mimeType: preparedAudio.file.mimetype,
      size: preparedAudio.file.size,
      duration: preparedAudio.durationSec,
      uploadedBy: userId,
      isPublished: true,
    }),
    Media.create({
      type: 'audio',
      title: tryAgainAudioFile.originalname,
      filePath: tryAgainAudioS3Key,
      url: tryAgainAudioUrl,
      mimeType: preparedTryAgainAudio.file.mimetype,
      size: preparedTryAgainAudio.file.size,
      duration: preparedTryAgainAudio.durationSec,
      uploadedBy: userId,
      isPublished: true,
    }),
    Media.create({
      type: 'audio',
      title: successAudioFile.originalname,
      filePath: successAudioS3Key,
      url: successAudioUrl,
      mimeType: preparedSuccessAudio.file.mimetype,
      size: preparedSuccessAudio.file.size,
      duration: preparedSuccessAudio.durationSec,
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
  if (introAudioFile && preparedIntroAudio.file) {
    const { url: introAudioUrl, s3Key: introAudioS3Key } = await s3Service.uploadFileFromMulter(preparedIntroAudio.file, 'media/audio');
    introAudioMedia = await Media.create({
      type: 'audio',
      title: introAudioFile.originalname,
      filePath: introAudioS3Key,
      url: introAudioUrl,
      mimeType: preparedIntroAudio.file.mimetype,
      size: preparedIntroAudio.file.size,
      duration: preparedIntroAudio.durationSec,
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

async function prepareAudioMulterFile(file) {
  if (!file) return { file: null, durationSec: null };
  const trimmed = await trimLeadingTrailingSilence(file);
  return {
    file: {
      ...file,
      buffer: trimmed.buffer,
      size: trimmed.size,
      mimetype: trimmed.mimetype,
    },
    durationSec: trimmed.durationSec,
  };
}

async function uploadMediaAndCreateDoc(file, { folder, type, userId }) {
  let uploadFile = file;
  let durationSec = null;
  if (type === 'audio') {
    const prepared = await prepareAudioMulterFile(file);
    uploadFile = prepared.file;
    durationSec = prepared.durationSec;
  }

  const { url, s3Key } = await s3Service.uploadFileFromMulter(uploadFile, folder);
  return Media.create({
    type,
    title: file.originalname,
    filePath: s3Key,
    url,
    mimeType: uploadFile.mimetype,
    size: uploadFile.size,
    duration: durationSec,
    uploadedBy: userId,
    isPublished: true,
  });
}

async function updateMissionVocabularyEntry({
  id,
  user,
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

  assertCreatorOwnsDocument(user, doc);

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

async function deleteMissionVocabularyEntry({ id, user, userId, sortOrder } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }

  assertCreatorOwnsDocument(user, doc);

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

async function uploadMissionImage({ id, user, userId, imageFile } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }

  assertCreatorOwnsDocument(user, doc);

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

async function uploadMissionMedia({ id, user, userId, shortVideoFile, missionIntroAudioFile, rewardAudioFile, rewardVideoFile } = {}) {
  const doc = await StarCamMission.findById(id);
  if (!doc) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }

  assertCreatorOwnsDocument(user, doc);

  if (doc.status === 'archived') {
    const err = new Error('Archived missions cannot be edited');
    err.statusCode = 400;
    throw err;
  }
  if (!shortVideoFile && !missionIntroAudioFile && !rewardAudioFile && !rewardVideoFile) {
    const err = new Error('shortVideo, missionIntroAudio, rewardAudio, or rewardVideo file is required');
    err.statusCode = 400;
    throw err;
  }

  const [preparedMissionIntroAudio, preparedRewardAudio] = await Promise.all([
    missionIntroAudioFile ? prepareAudioMulterFile(missionIntroAudioFile) : Promise.resolve({ file: null, durationSec: null }),
    rewardAudioFile ? prepareAudioMulterFile(rewardAudioFile) : Promise.resolve({ file: null, durationSec: null }),
  ]);

  const uploads = [];
  if (shortVideoFile) uploads.push(s3Service.uploadFileFromMulter(shortVideoFile, 'media/videos'));
  if (missionIntroAudioFile) uploads.push(s3Service.uploadFileFromMulter(preparedMissionIntroAudio.file, 'media/audio'));
  if (rewardAudioFile) uploads.push(s3Service.uploadFileFromMulter(preparedRewardAudio.file, 'media/audio'));
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

  if (missionIntroAudioFile) {
    const { url, s3Key } = uploaded[idx++];
    const missionIntroAudioMedia = await Media.create({
      type: 'audio',
      title: missionIntroAudioFile.originalname,
      filePath: s3Key,
      url,
      mimeType: preparedMissionIntroAudio.file.mimetype,
      size: preparedMissionIntroAudio.file.size,
      duration: preparedMissionIntroAudio.durationSec,
      uploadedBy: userId,
      isPublished: true,
    });
    doc.missionIntroAudio = missionIntroAudioMedia._id;
  }

  if (rewardAudioFile) {
    const { url, s3Key } = uploaded[idx++];
    const rewardAudioMedia = await Media.create({
      type: 'audio',
      title: rewardAudioFile.originalname,
      filePath: s3Key,
      url,
      mimeType: preparedRewardAudio.file.mimetype,
      size: preparedRewardAudio.file.size,
      duration: preparedRewardAudio.durationSec,
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

