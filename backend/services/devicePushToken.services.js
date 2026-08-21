const { DevicePushToken } = require('../models');

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalizePlatform(platform) {
  const value = String(platform || '').trim().toLowerCase();
  if (value !== 'ios' && value !== 'android') {
    throw httpError('Platform must be ios or android');
  }
  return value;
}

function normalizeToken(token) {
  const value = String(token || '').trim();
  if (!value) {
    throw httpError('Push token is required');
  }
  return value;
}

/**
 * Register or refresh a parent-device Expo push token.
 * One row per user + token. Refresh updates lastSeen and clears invalid.
 */
async function registerDevicePushToken({ userId, platform, token }) {
  if (!userId) {
    throw httpError('A parent user is required to register a device token');
  }
  const normalizedToken = normalizeToken(token);
  const normalizedPlatform = normalizePlatform(platform);

  const existing = await DevicePushToken.findOne({ userId, token: normalizedToken });
  if (existing) {
    existing.platform = normalizedPlatform;
    existing.lastSeenAt = new Date();
    existing.invalid = false;
    existing.invalidReason = null;
    await existing.save();
    return existing;
  }

  const stolen = await DevicePushToken.findOne({ token: normalizedToken });
  if (stolen) {
    stolen.userId = userId;
    stolen.platform = normalizedPlatform;
    stolen.lastSeenAt = new Date();
    stolen.invalid = false;
    stolen.invalidReason = null;
    await stolen.save();
    return stolen;
  }

  return DevicePushToken.create({
    userId,
    platform: normalizedPlatform,
    token: normalizedToken,
    lastSeenAt: new Date(),
    invalid: false,
  });
}

async function listActiveTokensForUser(userId) {
  if (!userId) return [];
  return DevicePushToken.find({ userId, invalid: { $ne: true } }).lean();
}

async function listActiveTokensForUsers(userIds) {
  if (!userIds?.length) return [];
  return DevicePushToken.find({ userId: { $in: userIds }, invalid: { $ne: true } }).lean();
}

async function markTokenInvalid(token, reason = 'invalid_token') {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return null;
  const row = await DevicePushToken.findOne({ token: normalizedToken });
  if (!row) return null;
  row.invalid = true;
  row.invalidReason = reason;
  await row.save();
  return row;
}

async function unregisterDevicePushToken({ userId, token }) {
  const normalizedToken = normalizeToken(token);
  return DevicePushToken.deleteOne({ userId, token: normalizedToken });
}

async function pruneInvalidTokens({ olderThanDays = 30 } = {}) {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  return DevicePushToken.deleteMany({
    invalid: true,
    updatedAt: { $lt: cutoff },
  });
}

module.exports = {
  registerDevicePushToken,
  listActiveTokensForUser,
  listActiveTokensForUsers,
  markTokenInvalid,
  unregisterDevicePushToken,
  pruneInvalidTokens,
};
