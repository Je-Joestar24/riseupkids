const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const TwoFactorSecret = require('../models/TwoFactorSecret');

dotenv.config();

const logger = (() => {
  try {
    return require('../config/logger');
  } catch {
    return console;
  }
})();

/**
 * One-time repair (Chunk 10 follow-up): User.twoFactorEnabled is a denormalized mirror of
 * TwoFactorSecret.enabled that authorize() reads for admins. Accounts that enrolled TOTP before the
 * mirror existed have an enabled secret but twoFactorEnabled=false, so they can log in with a
 * code and are then 403'd on every admin call. This makes the mirror match the secret in both
 * directions. Idempotent — safe to re-run.
 *
 * Pure data operation — assumes a mongoose connection already exists; `main()` owns connect/close.
 * @returns {Promise<{ enabledSet: number, enabledCleared: number }>}
 */
async function backfillTwoFactorEnabled() {
  const enabledUserIds = await TwoFactorSecret.find({ enabled: true }).distinct('userId');

  const setRes = await User.updateMany(
    { _id: { $in: enabledUserIds }, twoFactorEnabled: { $ne: true } },
    { $set: { twoFactorEnabled: true } }
  );
  const clearRes = await User.updateMany(
    { _id: { $nin: enabledUserIds }, twoFactorEnabled: true },
    { $set: { twoFactorEnabled: false } }
  );

  return { enabledSet: setRes.modifiedCount, enabledCleared: clearRes.modifiedCount };
}

async function main() {
  const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids');
  logger.info({ host: conn.connection.host }, '[BackfillTwoFactorEnabled] Connected');

  try {
    const result = await backfillTwoFactorEnabled();
    logger.info(result, '[BackfillTwoFactorEnabled] Done');
    return result;
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error({ err: error }, '[BackfillTwoFactorEnabled] Failed');
      process.exit(1);
    });
}

module.exports = { backfillTwoFactorEnabled, main };
