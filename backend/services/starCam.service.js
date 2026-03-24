const { ChildProfile, StarCamEvent } = require('../models');

const ALLOWED_EVENTS = ['ispy_round_started', 'ispy_target_found', 'ispy_game_completed'];
const ALLOWED_MODES = ['single_target', 'three_item', 'category', 'color'];

function parseObjectIdish(value) {
  if (!value) return null;
  const str = String(value).trim();
  return str || null;
}

function parseTimestamp(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    const err = new Error('Invalid timestamp');
    err.statusCode = 400;
    throw err;
  }
  return date;
}

function sanitizeWord(value) {
  if (value == null) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized || null;
}

async function assertChildOwnership(parentUserId, childId) {
  const parentId = parseObjectIdish(parentUserId);
  const cId = parseObjectIdish(childId);

  if (!parentId) {
    const err = new Error('Authentication required.');
    err.statusCode = 401;
    throw err;
  }

  if (!cId) {
    const err = new Error('childId is required.');
    err.statusCode = 400;
    throw err;
  }

  const child = await ChildProfile.findOne({ _id: cId, parent: parentId }).select('_id parent displayName');
  if (!child) {
    const err = new Error('Child not found or does not belong to you');
    err.statusCode = 403;
    throw err;
  }

  return child;
}

function validateEventPayload(eventType, payload) {
  if (!ALLOWED_EVENTS.includes(eventType)) {
    const err = new Error('Invalid event type');
    err.statusCode = 400;
    throw err;
  }

  if (payload.mode && !ALLOWED_MODES.includes(payload.mode)) {
    const err = new Error('Invalid mode');
    err.statusCode = 400;
    throw err;
  }

  if (eventType === 'ispy_round_started') {
    if (!payload.roundId || !String(payload.roundId).trim()) {
      const err = new Error('roundId is required for ispy_round_started');
      err.statusCode = 400;
      throw err;
    }
    if (!payload.targetWord || !String(payload.targetWord).trim()) {
      const err = new Error('targetWord is required for ispy_round_started');
      err.statusCode = 400;
      throw err;
    }
  }

  if (eventType === 'ispy_target_found') {
    if (!payload.roundId || !String(payload.roundId).trim()) {
      const err = new Error('roundId is required for ispy_target_found');
      err.statusCode = 400;
      throw err;
    }
    if (!payload.targetWord || !String(payload.targetWord).trim()) {
      const err = new Error('targetWord is required for ispy_target_found');
      err.statusCode = 400;
      throw err;
    }
    if (!payload.recognizedWord || !String(payload.recognizedWord).trim()) {
      const err = new Error('recognizedWord is required for ispy_target_found');
      err.statusCode = 400;
      throw err;
    }
  }

  if (eventType === 'ispy_game_completed') {
    if (!payload.gameId || !String(payload.gameId).trim()) {
      const err = new Error('gameId is required for ispy_game_completed');
      err.statusCode = 400;
      throw err;
    }
    if (!Array.isArray(payload.targets) || payload.targets.length === 0) {
      const err = new Error('targets is required for ispy_game_completed');
      err.statusCode = 400;
      throw err;
    }
  }
}

async function trackStarCamEvent({ parentUserId, childId, eventType, payload = {} }) {
  const child = await assertChildOwnership(parentUserId, childId);
  validateEventPayload(eventType, payload);

  const eventDoc = await StarCamEvent.create({
    event: eventType,
    parent: parentUserId,
    child: child._id,
    mode: payload.mode || 'single_target',
    levelId: payload.levelId || null,
    gameId: payload.gameId || null,
    roundId: payload.roundId || null,
    targetWord: sanitizeWord(payload.targetWord),
    recognizedWord: sanitizeWord(payload.recognizedWord),
    targets: Array.isArray(payload.targets) ? payload.targets.map((w) => sanitizeWord(w)).filter(Boolean) : undefined,
    attempts: Number.isFinite(Number(payload.attempts)) ? Number(payload.attempts) : null,
    durationSeconds: Number.isFinite(Number(payload.durationSeconds)) ? Number(payload.durationSeconds) : null,
    hintUsed: Boolean(payload.hintUsed),
    devicePerformanceTier: payload.devicePerformanceTier || null,
    happenedAt: parseTimestamp(payload.timestamp),
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
  });

  return eventDoc.toObject();
}

function clampInt(value, { min, max, fallback }) {
  const num = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

async function listStarCamEvents({
  parentUserId,
  childId,
  event,
  mode,
  page = 1,
  limit = 20,
}) {
  const parentId = parseObjectIdish(parentUserId);
  if (!parentId) {
    const err = new Error('Authentication required.');
    err.statusCode = 401;
    throw err;
  }

  const query = { parent: parentId };
  if (childId) query.child = parseObjectIdish(childId);
  if (event && ALLOWED_EVENTS.includes(event)) query.event = event;
  if (mode && ALLOWED_MODES.includes(mode)) query.mode = mode;

  const pageNum = clampInt(page, { min: 1, max: 1000000, fallback: 1 });
  const limitNum = clampInt(limit, { min: 1, max: 100, fallback: 20 });
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    StarCamEvent.find(query)
      .sort({ happenedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    StarCamEvent.countDocuments(query),
  ]);

  return {
    items,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      hasNext: skip + items.length < total,
      hasPrev: pageNum > 1,
    },
  };
}

module.exports = {
  trackStarCamEvent,
  listStarCamEvents,
  _internal: {
    sanitizeWord,
    parseTimestamp,
    validateEventPayload,
  },
};
