const { User } = require('../models');
const { assertTimeZone } = require('../utils/notificationTimezone.util');

/**
 * Last-seen parent device wins. One timezone per account so every device
 * on that family receives the same send, once.
 */
async function reportUserTimezone({ userId, timezone }) {
  if (!userId) return null;
  const raw = String(timezone || '').trim();
  if (!raw) return null;
  let zone;
  try {
    zone = assertTimeZone(raw);
  } catch {
    return null;
  }

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        timezone: zone,
        timezoneUpdatedAt: new Date(),
        timezoneSource: 'device',
      },
    }
  );
  return zone;
}

module.exports = {
  reportUserTimezone,
};
