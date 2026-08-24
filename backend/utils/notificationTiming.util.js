const {
  assertTimeZone,
  wallTimeToUtc,
  getTimeZoneParts,
} = require('./notificationTimezone.util');

const FALLBACK_TIMEZONE = 'America/Sao_Paulo';
const EARLIEST_WORLD_ZONE = 'Pacific/Kiritimati';
const QUIET_HOURS_START_MINUTES = 20 * 60;
const QUIET_HOURS_END_MINUTES = 7 * 60;
const TIMING_MODES = ['recipient_local', 'same_moment'];
const QUIET_HOUR_BEHAVIORS = ['defer', 'expire'];

function pad2(value) {
  return String(value).padStart(2, '0');
}

function localDateString(date, timeZone) {
  const parts = getTimeZoneParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addCalendarDay(ymd) {
  const [year, month, day] = String(ymd).split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

function localMinutesOfDay(date, timeZone) {
  const parts = getTimeZoneParts(date, timeZone);
  const hour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
  return hour * 60 + Number(parts.minute);
}

function resolveRecipientTimezone(value) {
  const raw = String(value || '').trim();
  if (!raw) return FALLBACK_TIMEZONE;
  try {
    return assertTimeZone(raw);
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

function normalizeTimingMode(value) {
  return value === 'recipient_local' ? 'recipient_local' : 'same_moment';
}

function normalizeQuietHourBehavior(value) {
  return value === 'expire' ? 'expire' : 'defer';
}

function normalizeSendTime(value) {
  const raw = String(value || '').trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw.slice(0, 5);
  return raw;
}

function isInQuietHours(date, timeZone) {
  const zone = resolveRecipientTimezone(timeZone);
  const minutes = localMinutesOfDay(date, zone);
  return minutes >= QUIET_HOURS_START_MINUTES || minutes < QUIET_HOURS_END_MINUTES;
}

function nextQuietHoursEnd(date, timeZone) {
  const zone = resolveRecipientTimezone(timeZone);
  const today = localDateString(date, zone);
  let candidate = wallTimeToUtc({ sendDate: today, sendTime: '07:00', timezone: zone });
  if (candidate.getTime() <= date.getTime()) {
    candidate = wallTimeToUtc({
      sendDate: addCalendarDay(today),
      sendTime: '07:00',
      timezone: zone,
    });
  }
  return candidate;
}

function earliestWorldwideSendAt({ sendDate, sendTime }) {
  return wallTimeToUtc({
    sendDate,
    sendTime: normalizeSendTime(sendTime),
    timezone: EARLIEST_WORLD_ZONE,
  });
}

function parseExpiresAt(payload, timezone) {
  if (payload?.expiresAt) {
    const parsed = new Date(payload.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      const err = new Error('Expiration must be a valid date');
      err.statusCode = 400;
      throw err;
    }
    return parsed;
  }
  const expiresDate = String(payload?.expiresDate || '').trim();
  const expiresTime = normalizeSendTime(payload?.expiresTime);
  if (!expiresDate && !expiresTime) return null;
  if (!expiresDate || !expiresTime) {
    const err = new Error('Expiration needs both a date and time');
    err.statusCode = 400;
    throw err;
  }
  return wallTimeToUtc({ sendDate: expiresDate, sendTime: expiresTime, timezone });
}

/**
 * Decide whether a recipient should receive, wait, defer to 7:00 AM, or expire.
 * Quiet hours are 20:00–07:00 in the recipient's IANA timezone.
 */
function resolveDeliveryDecision({ campaign, timezone, now, trigger }) {
  const zone = resolveRecipientTimezone(timezone);
  const at = now instanceof Date ? now : new Date(now);
  const quietBehavior = normalizeQuietHourBehavior(campaign?.quietHourBehavior);
  const timingMode = normalizeTimingMode(campaign?.timingMode);
  const expiresAt = campaign?.expiresAt ? new Date(campaign.expiresAt) : null;

  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && at.getTime() >= expiresAt.getTime()) {
    return { action: 'expire', reason: 'expired', sendAt: null, timezone: zone };
  }

  let intendedAt;
  if (trigger === 'send_now' || trigger === 'test') {
    intendedAt = at;
  } else if (timingMode === 'recipient_local') {
    intendedAt = wallTimeToUtc({
      sendDate: campaign.sendLocalDate,
      sendTime: normalizeSendTime(campaign.sendLocalTime),
      timezone: zone,
    });
  } else {
    intendedAt = campaign?.sendAt ? new Date(campaign.sendAt) : at;
  }

  if (intendedAt.getTime() > at.getTime()) {
    return { action: 'wait', reason: 'not_due', sendAt: intendedAt, timezone: zone };
  }

  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && intendedAt.getTime() >= expiresAt.getTime()) {
    return { action: 'expire', reason: 'expired', sendAt: null, timezone: zone };
  }

  if (isInQuietHours(at, zone)) {
    if (quietBehavior === 'expire') {
      return { action: 'expire', reason: 'quiet_hours_expire', sendAt: null, timezone: zone };
    }
    const deferredAt = nextQuietHoursEnd(at, zone);
    if (expiresAt && !Number.isNaN(expiresAt.getTime()) && deferredAt.getTime() >= expiresAt.getTime()) {
      return { action: 'expire', reason: 'expired', sendAt: null, timezone: zone };
    }
    return { action: 'defer', reason: 'quiet_hours_defer', sendAt: deferredAt, timezone: zone };
  }

  return { action: 'send', reason: null, sendAt: at, timezone: zone };
}

module.exports = {
  FALLBACK_TIMEZONE,
  EARLIEST_WORLD_ZONE,
  TIMING_MODES,
  QUIET_HOUR_BEHAVIORS,
  QUIET_HOURS_START_MINUTES,
  QUIET_HOURS_END_MINUTES,
  resolveRecipientTimezone,
  normalizeTimingMode,
  normalizeQuietHourBehavior,
  normalizeSendTime,
  isInQuietHours,
  nextQuietHoursEnd,
  earliestWorldwideSendAt,
  parseExpiresAt,
  resolveDeliveryDecision,
};
