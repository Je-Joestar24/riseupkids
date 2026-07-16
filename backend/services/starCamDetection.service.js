const { randomUUID } = require('crypto');
const { StarCamMission } = require('../models');
const { assertChildOwnership } = require('./starCamChild.service');
const googleVisionService = require('./googleVision.service');
const { STARCAM_MAX_OBJECTS, STARCAM_MAX_SORT_ORDER } = require('../constants/starCamMissionObjects.constants');

function asTrimmed(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str || null;
}

function asSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isMongoObjectIdString(value) {
  return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
}

function publishedMissionLookupQuery(safeMissionId) {
  if (isMongoObjectIdString(safeMissionId)) {
    return {
      status: 'published',
      $or: [{ _id: safeMissionId }, { missionId: safeMissionId }],
    };
  }
  return { status: 'published', missionId: safeMissionId };
}

/** Lowercase, strip punctuation for fuzzy compare */
function normalizeLabelToken(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DEFAULT_SYNONYMS = {
  book: ['book', 'storybook', 'textbook', 'publication', 'novel', 'paperback', 'hardcover'],
  leaf: ['leaf', 'leaves', 'plant', 'foliage', 'greenery'],
  spoon: ['spoon', 'silverware', 'utensil', 'cutlery'],
  apple: ['apple', 'fruit', 'produce'],
  banana: ['banana', 'fruit'],
  cup: ['cup', 'mug', 'drinkware', 'tumbler'],
  bottle: ['bottle', 'water bottle', 'container'],
  chair: ['chair', 'seat', 'furniture'],
  table: ['table', 'desk', 'furniture'],
  phone: ['phone', 'mobile phone', 'smartphone', 'cellular telephone'],
  toy: ['toy', 'plaything'],
};

function getSynonymSetForTarget(target) {
  const key = normalizeLabelToken(target).replace(/\s+/g, '_');
  const simple = normalizeLabelToken(target);
  const fromMap = DEFAULT_SYNONYMS[simple] || DEFAULT_SYNONYMS[key];
  const base = new Set([simple, key.replace(/_/g, ' ')].filter(Boolean));
  if (fromMap) {
    fromMap.forEach((w) => base.add(normalizeLabelToken(w)));
  }
  return base;
}

function getConfidenceThreshold() {
  const n = Number(process.env.VISION_CONFIDENCE_THRESHOLD);
  if (Number.isFinite(n) && n > 0 && n <= 1) return n;
  return 0.75;
}

function shouldExposeLabelPreview() {
  const s = String(process.env.VISION_RETURN_LABEL_PREVIEW || '').toLowerCase();
  return s === 'true' || s === '1';
}

function scoreLabelAgainstCandidates(description, candidates) {
  const norm = normalizeLabelToken(description);
  if (!norm) return { match: false, score: 0, matchedTerm: null };
  for (const term of candidates) {
    const t = normalizeLabelToken(term);
    if (!t) continue;
    if (norm === t) return { match: true, score: 1, matchedTerm: t };
    if (norm.includes(t) || t.includes(norm)) return { match: true, score: 0.92, matchedTerm: t };
  }
  return { match: false, score: 0, matchedTerm: null };
}

function resolveCandidateTerms({ target, keywordBucket } = {}) {
  const terms = Array.isArray(keywordBucket?.terms) ? keywordBucket.terms : [];
  const normalized = new Set();
  for (const term of terms) {
    const value = normalizeLabelToken(term);
    if (value) normalized.add(value);
  }
  if (normalized.size > 0) return normalized;

  return getSynonymSetForTarget(target);
}

function evaluateLabelsForTarget(target, visionLabels, threshold, keywordBucket = null) {
  const candidates = resolveCandidateTerms({ target, keywordBucket });
  let best = { isMatch: false, confidence: 0, matchedLabel: null, matchedTerm: null };

  for (const vl of visionLabels) {
    const desc = vl.description;
    const apiScore = typeof vl.score === 'number' ? vl.score : 0;
    const { match, score: lexicalScore, matchedTerm } = scoreLabelAgainstCandidates(desc, candidates);
    if (!match) continue;
    const combined = Math.min(1, apiScore * lexicalScore);
    if (combined > best.confidence) {
      best = {
        isMatch: true,
        confidence: combined,
        matchedLabel: desc,
        matchedTerm,
      };
    }
  }

  const passes = best.isMatch && best.confidence >= threshold;
  return { passes, best, threshold };
}

function resolveHuntItem(items, { itemOrder, sortOrder }) {
  const list = (items || [])
    .slice()
    .sort((a, b) => asSafeNumber(a.sortOrder, 0) - asSafeNumber(b.sortOrder, 0));

  const sortRaw = sortOrder;
  if (sortRaw !== undefined && sortRaw !== null && String(sortRaw).trim() !== '') {
    const want = asSafeNumber(sortRaw, -1);
    const found = list.find((it) => asSafeNumber(it.sortOrder, -999) === want);
    return found || null;
  }

  const order = asSafeNumber(itemOrder, 0);
  if (order >= 1 && order <= list.length) {
    return list[order - 1] || null;
  }
  return null;
}

function findVocabByTarget(vocab = [], target) {
  const safeTarget = normalizeLabelToken(target);
  if (!safeTarget) return null;
  return (vocab || []).find((v) => normalizeLabelToken(v?.target) === safeTarget) || null;
}

function isSeedPlaceholderAudioUrl(url) {
  const safeUrl = String(url || '').toLowerCase();
  return safeUrl.includes('/starcam_seed_') && safeUrl.includes('_temp.');
}

function pickRealAudioUrl(...mediaDocs) {
  const fallback = [];
  for (const media of mediaDocs) {
    const url = media?.url || null;
    if (!url) continue;
    if (!isSeedPlaceholderAudioUrl(url)) return url;
    fallback.push(url);
  }
  return fallback[0] || null;
}

/**
 * Star Cam hunt-step object detection using Google Vision label detection.
 *
 * @param {object} params
 * @param {string} params.parentUserId
 * @param {string} params.childId
 * @param {string} params.missionId - slug or Mongo id
 * @param {string|number} [params.itemOrder] - 1-based step index (matches flow.starCam.items order)
 * @param {string|number} [params.sortOrder] - mission item sortOrder 0..6
 * @param {Buffer} params.imageBuffer
 */
async function detectMissionObjectForChild({
  parentUserId,
  childId,
  missionId,
  itemOrder,
  sortOrder,
  imageBuffer,
} = {}) {
  await assertChildOwnership(parentUserId, childId);

  const safeMissionId = asTrimmed(missionId);
  if (!safeMissionId) {
    const err = new Error('missionId is required');
    err.statusCode = 400;
    throw err;
  }

  if (!googleVisionService.isVisionConfigured()) {
    const err = new Error('Object detection is not available. Please try again later.');
    err.statusCode = 503;
    err.code = 'STARCAM_VISION_UNAVAILABLE';
    throw err;
  }

  const mission = await StarCamMission.findOne(publishedMissionLookupQuery(safeMissionId))
    .select('missionId title items vocab')
    .populate({ path: 'items.questionAudio', select: 'url type duration' })
    .populate({ path: 'items.tryAgainAudio', select: 'url type duration' })
    .populate({ path: 'items.successAudio', select: 'url type duration' })
    .populate({ path: 'vocab.audio', select: 'url type duration' })
    .populate({ path: 'vocab.introAudio', select: 'url type duration' })
    .populate({ path: 'vocab.tryAgainAudio', select: 'url type duration' })
    .populate({ path: 'vocab.successAudio', select: 'url type duration' })
    .lean();

  if (!mission) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }

  const huntItem = resolveHuntItem(mission.items, { itemOrder, sortOrder });
  if (!huntItem || !asTrimmed(huntItem.target)) {
    const err = new Error(
      `Invalid hunt step: provide itemOrder (1-${STARCAM_MAX_OBJECTS}) or sortOrder (0-${STARCAM_MAX_SORT_ORDER})`
    );
    err.statusCode = 400;
    err.code = 'STARCAM_INVALID_STEP';
    throw err;
  }

  const target = asTrimmed(huntItem.target).toLowerCase();
  const matchingVocab = findVocabByTarget(mission.vocab || [], target);
  const threshold = getConfidenceThreshold();
  const keywordBucket =
    huntItem.keywordBucket?.terms?.length > 0
      ? huntItem.keywordBucket
      : matchingVocab?.keywordBucket?.terms?.length > 0
        ? matchingVocab.keywordBucket
        : null;

  const { labels } = await googleVisionService.detectLabelsFromImageBuffer(imageBuffer);
  const { passes, best } = evaluateLabelsForTarget(target, labels, threshold, keywordBucket);

  const attemptId = randomUUID();
  const processedAt = new Date().toISOString();

  const ui = passes
    ? {
        title: 'Great job!',
        message: asTrimmed(huntItem.successText) || asTrimmed(huntItem.success) || 'You found the right object.',
        audioUrl: pickRealAudioUrl(huntItem.successAudio, matchingVocab?.successAudio),
        tone: 'success',
        nextAction: 'continue',
      }
    : {
        title: 'Try again!',
        message: asTrimmed(huntItem.tryAgainText) || asTrimmed(huntItem.fail) || 'Try again and find the object one more time.',
        audioUrl: pickRealAudioUrl(huntItem.tryAgainAudio, matchingVocab?.tryAgainAudio),
        tone: 'retry',
        nextAction: 'retry',
      };

  const sortedItems = (mission.items || [])
    .slice()
    .sort((a, b) => asSafeNumber(a.sortOrder, 0) - asSafeNumber(b.sortOrder, 0));
  const stepIndex = sortedItems.findIndex(
    (it) => asSafeNumber(it.sortOrder, -1) === asSafeNumber(huntItem.sortOrder, -2)
  );
  const resolvedItemOrder = stepIndex >= 0 ? stepIndex + 1 : null;

  const data = {
    missionId: mission.missionId,
    target,
    status: passes ? 'matched' : 'not_matched',
    result: {
      isMatch: passes,
      confidence: passes ? Math.round(best.confidence * 1000) / 1000 : Math.round(best.confidence * 1000) / 1000,
      confidencePercent: Math.round(Math.min(1, best.confidence) * 100),
    },
    ui,
    meta: {
      attemptId,
      processedAt,
      itemOrder: resolvedItemOrder,
      sortOrder: asSafeNumber(huntItem.sortOrder, 0),
      threshold,
    },
  };

  if (shouldExposeLabelPreview()) {
    data.meta.topLabels = labels.slice(0, 8).map((l) => ({
      description: l.description,
      score: l.score,
    }));
  }

  return data;
}

module.exports = {
  detectMissionObjectForChild,
  normalizeLabelToken,
  evaluateLabelsForTarget,
  resolveCandidateTerms,
  resolveHuntItem,
};
