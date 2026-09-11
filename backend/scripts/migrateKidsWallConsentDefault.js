const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { ChildProfile } = require('../models');

dotenv.config();

// scripts/ is exempt from the Chunk 6 no-raw-console CI gate (operator CLI tooling), but this one
// already had a logger available at runtime — keep using it for consistency with server logs.
const logger = (() => {
  try {
    return require('../config/logger');
  } catch {
    return console;
  }
})();

/**
 * RUK-SEC-006 remediation. REVERSES what this script used to do.
 *
 * Before the fix, every child profile had Kids Wall auto-granted at creation
 * (`kidsWallEnabled: true` + a fabricated `kidsWallConsentAt`) with no parent action — and this
 * script used to force that same auto-grant onto any profile that was missing it. That is exactly
 * the bug: a boolean + a timestamp that were both set by code, not by a parent.
 *
 * This version finds child profiles whose consent timestamp is suspiciously close to the
 * profile's creation time (within `autoGrantWindowMs`) — i.e. it was almost certainly set by the
 * old auto-grant code path in the same instant the child was created, not by a parent visiting
 * settings afterward — and resets those back to the safe default (off, no consent record).
 *
 * A child whose `kidsWallConsentAt` is meaningfully later than `createdAt` is left untouched:
 * that gap is evidence of a real, separate parent action (the consent toggle) and is not
 * disturbed by this migration.
 *
 * Pure data operation — assumes a mongoose connection already exists. See `main()` below for the
 * CLI entry point, which owns connect/close.
 */
async function migrateKidsWallConsentDefault({ autoGrantWindowMs = 60_000 } = {}) {
  const filter = {
    kidsWallEnabled: true,
    kidsWallConsentAt: { $ne: null },
    $expr: {
      $lte: [
        { $abs: { $subtract: ['$kidsWallConsentAt', '$createdAt'] } },
        autoGrantWindowMs,
      ],
    },
  };

  const matchedCount = await ChildProfile.countDocuments(filter);
  const result = await ChildProfile.updateMany(filter, {
    $set: {
      kidsWallEnabled: false,
      kidsWallConsentAt: null,
      kidsWallConsentIp: null,
    },
  });

  return {
    matchedCount,
    modifiedCount: result.modifiedCount ?? result.nModified ?? 0,
  };
}

/** CLI entry point: owns the database connection lifecycle around the pure migration above. */
async function main() {
  const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids');
  logger.info({ host: conn.connection.host }, '[KidsWallConsentDefault] Connected');

  try {
    const result = await migrateKidsWallConsentDefault();
    logger.info(result, '[KidsWallConsentDefault] Done');
    return result;
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error({ err: error }, '[KidsWallConsentDefault] Failed');
      process.exit(1);
    });
}

module.exports = { migrateKidsWallConsentDefault, main };
