const { listActiveTokensForUser, markTokenInvalid } = require('./devicePushToken.services');
const { sendExpoPushMessages } = require('./notificationPush.client');

const INVALID_TOKEN_ERRORS = new Set(['DeviceNotRegistered', 'InvalidCredentials']);

const ANDROID_CHANNEL_ID = 'riseupkids-default';

function asDataValue(value) {
  if (value == null || value === '') return undefined;
  return String(value);
}

function buildPushPayload({ title, message, destination, campaignId, childId, isTest }) {
  const data = {};
  const campaign = asDataValue(campaignId);
  const destinationKind = asDataValue(destination?.kind);
  const contentId = asDataValue(destination?.contentId);
  const child = asDataValue(childId);
  if (campaign) data.campaignId = campaign;
  if (destinationKind) data.destinationKind = destinationKind;
  if (contentId) data.contentId = contentId;
  if (child) data.childId = child;
  data.isTest = isTest ? 'true' : 'false';

  return {
    title: String(title || '').trim(),
    body: String(message || '').trim(),
    sound: 'default',
    channelId: ANDROID_CHANNEL_ID,
    priority: 'high',
    ttl: 3600,
    interruptionLevel: 'timeSensitive',
    data,
  };
}

function isInvalidTokenTicket(ticket) {
  const errorCode = ticket?.details?.error || ticket?.details?.errorCode;
  return ticket?.status === 'error' && INVALID_TOKEN_ERRORS.has(errorCode);
}

/**
 * Deliver a campaign push to every active token on the parent user.
 * One token failure does not abort the rest.
 */
async function deliverPush(
  { userId, childId, title, message, destination, campaignId, isTest },
  { sendMessages, listTokens, invalidateToken } = {}
) {
  if (!userId) {
    return { status: 'skipped', reason: 'missing_user' };
  }

  const loadTokens = listTokens || listActiveTokensForUser;
  const tokens = await loadTokens(userId);
  if (!tokens.length) {
    console.warn(`[notifications] no_device_token user=${userId}`);
    return { status: 'skipped', reason: 'no_device_token' };
  }

  const payload = buildPushPayload({ title, message, destination, campaignId, childId, isTest });
  const messages = tokens.map((row) => ({
    to: row.token,
    ...payload,
  }));

  let tickets = [];
  try {
    const send = sendMessages || sendExpoPushMessages;
    tickets = await send(messages);
  } catch (error) {
    return { status: 'failed', reason: error.message || 'provider_error', payload };
  }

  const markInvalid = invalidateToken || markTokenInvalid;
  let sentCount = 0;
  let failedCount = 0;
  const tokenFailures = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const tokenRow = tokens[index];
    const ticket = tickets[index] || { status: 'error', details: { error: 'provider_error' } };
    if (ticket.status === 'ok') {
      sentCount += 1;
      continue;
    }
    failedCount += 1;
    const reason = isInvalidTokenTicket(ticket) ? 'invalid_token' : ticket.message || 'provider_error';
    tokenFailures.push({ token: tokenRow.token, reason });
    if (isInvalidTokenTicket(ticket)) {
      await markInvalid(tokenRow.token, 'invalid_token');
    }
    console.error(
      `[notifications] token failed user=${userId} token=${String(tokenRow.token).slice(0, 12)}… reason=${reason}`
    );
  }

  if (sentCount > 0) {
    return { status: 'sent', reason: null, payload, sentCount, failedCount, tokenFailures };
  }
  return {
    status: 'failed',
    reason: tokenFailures[0]?.reason || 'provider_error',
    payload,
    sentCount,
    failedCount,
    tokenFailures,
  };
}

module.exports = {
  buildPushPayload,
  deliverPush,
  INVALID_TOKEN_ERRORS,
};
