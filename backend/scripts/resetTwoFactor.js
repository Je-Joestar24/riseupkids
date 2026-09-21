const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const TwoFactorSecret = require('../models/TwoFactorSecret');
const RecoveryCode = require('../models/RecoveryCode');

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
 * Operator escape hatch for local/staging testing (Chunk 10): fully clears two-factor enrollment
 * for one account — deletes its TwoFactorSecret and any RecoveryCode rows — so the normal
 * enrollment screen can be used again from scratch.
 *
 * This bypasses the normal disable() flow (which requires a password and a valid code) on
 * purpose: it exists for the case where an account got stuck in a bad enrollment state (e.g. a
 * duplicate setup request landing after confirmation) and neither the app nor a code is usable
 * to get back in. NOT meant to be exposed as an API endpoint — CLI/operator use only.
 *
 * Pure data operation — assumes a mongoose connection already exists. See `main()` below for the
 * CLI entry point, which owns connect/close.
 * @param {string} email
 */
async function resetTwoFactor(email) {
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('_id email role');
  if (!user) {
    throw new Error(`No user found with email ${email}`);
  }

  const [secretResult, codesResult] = await Promise.all([
    TwoFactorSecret.deleteOne({ userId: user._id }),
    RecoveryCode.deleteMany({ userId: user._id }),
    // Mirrors twoFactor.services.js's disable() — without this, the User document's denormalized
    // flag would stay stale (true), which now gates every admin-authorized request.
    User.updateOne({ _id: user._id }, { twoFactorEnabled: false }),
  ]);

  return {
    email: user.email,
    role: user.role,
    secretRemoved: secretResult.deletedCount > 0,
    recoveryCodesRemoved: codesResult.deletedCount,
  };
}

/** CLI entry point: owns the database connection lifecycle around the pure operation above. */
async function main() {
  const email = process.argv[2];
  if (!email) {
    logger.error('Usage: node scripts/resetTwoFactor.js <email>');
    process.exit(1);
  }

  const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids');
  logger.info({ host: conn.connection.host }, '[ResetTwoFactor] Connected');

  try {
    const result = await resetTwoFactor(email);
    logger.info(result, '[ResetTwoFactor] Done — account can re-enroll in two-factor from scratch');
    return result;
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error({ err: error }, '[ResetTwoFactor] Failed');
      process.exit(1);
    });
}

module.exports = { resetTwoFactor, main };
