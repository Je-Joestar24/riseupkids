const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function assertTimeZone(timeZone) {
  const value = String(timeZone || '').trim();
  if (!value) {
    throw httpError('Timezone is required');
  }
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
  } catch {
    throw httpError(`Invalid timezone "${value}"`);
  }
  return value;
}

function partsToUtcMillis(parts) {
  const hour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second || 0)
  );
}

function getTimeZoneParts(date, timeZone) {
  const map = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(date)
    .forEach((part) => {
      if (part.type !== 'literal') map[part.type] = part.value;
    });
  return map;
}

/**
 * Convert a wall-clock date+time in an IANA zone to a UTC Date.
 * Example: 2026-08-20 09:00 in America/Sao_Paulo → 12:00 UTC (standard time).
 */
function wallTimeToUtc({ sendDate, sendTime, timezone }) {
  const date = String(sendDate || '').trim();
  const time = String(sendTime || '').trim();
  if (!DATE_PATTERN.test(date)) {
    throw httpError('Send date must be YYYY-MM-DD');
  }
  if (!TIME_PATTERN.test(time)) {
    throw httpError('Send time must be HH:mm');
  }
  const zone = assertTimeZone(timezone);
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = partsToUtcMillis(getTimeZoneParts(new Date(utcGuess), zone)) - utcGuess;
  return new Date(utcGuess - offset);
}

function isCampaignDue(campaign, now = new Date()) {
  if (!campaign || campaign.status !== 'scheduled') return false;
  if (!campaign.sendAt) return false;
  return new Date(campaign.sendAt).getTime() <= now.getTime();
}

function hasHardCodedWeeklyCadence(source) {
  return /every\s+monday|0\s+0\s+\*\s+\*\s+1|cron\(.*monday/i.test(String(source || ''));
}

module.exports = {
  assertTimeZone,
  wallTimeToUtc,
  isCampaignDue,
  hasHardCodedWeeklyCadence,
};
