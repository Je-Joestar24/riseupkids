const { listActiveTokensForUser, markTokenInvalid } = require('./devicePushToken.services');
const { sendExpoPushMessages } = require('./notificationPush.client');

const INVALID_TOKEN_ERRORS = new Set(['DeviceNotRegistered', 'InvalidCredentials']);

const ANDROID_CHANNEL_ID = 'riseupkids-default';
const DEFAULT_PUSH_IMAGE_PATH = '/notification-assets/app-icon-1024x1024.png';

function asDataValue(value) {
  if (value == null || value === '') return undefined;
  return String(value);
}

function getDefaultPushImageUrl(env = process.env) {
  const base = String(env.BACKEND_BASE_URL || env.APP_URL || '').replace(/\/$/, '');
  if (!base) return undefined;
  return `${base}${DEFAULT_PUSH_IMAGE_PATH}`;
}

function resolvePushImageUrl(imageUrl, env = process.env) {
  const custom = String(imageUrl || '').trim();
  if (custom) return custom;
  return getDefaultPushImageUrl(env);
}

function buildPushPayload({ title, message, destination, campaignId, childId, isTest, imageUrl }) {
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

  const payload = {
    title: String(title || '').trim(),
    body: String(message || '').trim(),
    sound: 'default',
    channelId: ANDROID_CHANNEL_ID,
    priority: 'high',
    ttl: 3600,
    interruptionLevel: 'time-sensitive',
    data,
  };

  const image = resolvePushImageUrl(imageUrl);
  if (image) {
    payload.image = image;
    payload.richContent = { image };
  }

  return payload;
}

function isInvalidTokenTicket(ticket) {
  const errorCode = ticket?.details?.error || ticket?.details?.errorCode;
  return ticket?.status === 'error' && INVALID_TOKEN_ERRORS.has(errorCode);
}

function clientKindKey(row) {
  if (row?.clientKind === 'expo-go' || row?.clientKind === 'standalone') return row.clientKind;
  return 'unknown';
}

function isMixedExperienceError(error) {
  const text = `${error?.message || ''} ${JSON.stringify(error?.expoErrors || [])}`;
  return /PUSH_TOO_MANY_EXPERIENCE/i.test(text);
}

function errorTicket(error) {
  return {
    status: 'error',
    message: error?.message || 'provider_error',
    details: { error: 'provider_error' },
  };
}

/**
 * Expo rejects a batch that mixes Expo Go tokens with standalone/preview tokens.
 * Send each experience separately, and retry one-by-one if a mixed batch still 400s.
 */
async function sendTicketsForTokens(tokens, payload, send) {
  const groups = new Map();
  tokens.forEach((row) => {
    const key = clientKindKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  const ticketsByToken = new Map();

  const sendGroup = async (group) => {
    const messages = group.map((row) => ({ to: row.token, ...payload }));
    try {
      const tickets = await send(messages);
      group.forEach((row, index) => {
        ticketsByToken.set(row.token, tickets[index] || errorTicket());
      });
    } catch (error) {
      if (group.length > 1 && (isMixedExperienceError(error) || clientKindKey(group[0]) === 'unknown')) {
        for (const row of group) {
          await sendGroup([row]);
        }
        return;
      }
      group.forEach((row) => ticketsByToken.set(row.token, errorTicket(error)));
    }
  };

  for (const group of groups.values()) {
    await sendGroup(group);
  }

  return tokens.map((row) => ticketsByToken.get(row.token) || errorTicket());
}

/**
 * Deliver a campaign push to every active token on the parent user.
 * One token failure does not abort the rest.
 */
async function deliverPush(
  { userId, childId, title, message, destination, campaignId, isTest, imageUrl },
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

  const payload = buildPushPayload({ title, message, destination, campaignId, childId, isTest, imageUrl });
  const send = sendMessages || sendExpoPushMessages;
  const tickets = await sendTicketsForTokens(tokens, payload, send);

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
  getDefaultPushImageUrl,
  resolvePushImageUrl,
  INVALID_TOKEN_ERRORS,
};
