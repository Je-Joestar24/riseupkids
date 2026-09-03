/**
 * Temporary account lockout after repeated failed password logins (RUK-SEC-007).
 *
 * Complements the per-IP rate limiter (middleware/rateLimit.js): the IP limiter stops one machine
 * hammering many accounts; this stops many machines (a botnet) hammering one account.
 *
 * Model: `User.failedLoginAttempts`, `User.lockUntil`, `User.lastFailedLoginAt` (all `select: false`).
 *
 * Behaviour:
 *  - Each wrong password increments the counter.
 *  - Once the counter reaches the threshold, the account is locked for an exponentially growing
 *    window (base, 2*base, 4*base, ... capped).
 *  - A correct password (or a password reset) clears everything.
 *  - If the last failure was long enough ago, the counter is forgotten before counting the new one,
 *    so an occasional typo weeks apart never accumulates into a lockout.
 *  - A locked account is rejected BEFORE the password is checked, with the SAME "Invalid credentials"
 *    error as a wrong password — an attacker can't tell they've locked someone. The real reason is
 *    logged server-side.
 *
 * All thresholds/durations are env-overridable so local dev can loosen them.
 */
const { User } = require('../models');

function envInt(name, fallback) {
  const raw = parseInt(process.env[name] || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Failed attempts before the account locks. */
const threshold = () => envInt('LOGIN_LOCKOUT_THRESHOLD', 8);
/** First lock duration; doubles for each further failed attempt. */
const baseLockMs = () => envInt('LOGIN_LOCKOUT_BASE_MS', 60 * 1000);
/** Hard cap on a single lock duration. */
const maxLockMs = () => envInt('LOGIN_LOCKOUT_MAX_MS', 60 * 60 * 1000);
/** Quiet time after which a stale failed-attempt count is forgotten. */
const attemptResetMs = () => envInt('LOGIN_LOCKOUT_ATTEMPT_RESET_MS', 24 * 60 * 60 * 1000);

/**
 * @param {{ lockUntil?: Date|string|null }} user
 * @param {number} [now]
 * @returns {boolean}
 */
function isAccountLocked(user, now = Date.now()) {
  return Boolean(user && user.lockUntil && new Date(user.lockUntil).getTime() > now);
}

/**
 * Lock duration for a given failed-attempt count: base * 2^(attempts - threshold), capped.
 * @param {number} failedAttempts
 * @returns {number} milliseconds
 */
function computeLockMs(failedAttempts) {
  const over = Math.max(0, failedAttempts - threshold());
  return Math.min(baseLockMs() * 2 ** over, maxLockMs());
}

/**
 * Record a failed password attempt for a user and lock the account if the threshold is reached.
 * Mutates `user` in memory and persists via `updateOne` (no full save / no pre-save hook).
 * @param {import('mongoose').Document & { _id: any, failedLoginAttempts?: number, lastFailedLoginAt?: Date }} user
 * @param {number} [now]
 * @returns {Promise<{ attempts: number, lockUntil: Date|null, justLocked: boolean }>}
 */
async function registerFailedLogin(user, now = Date.now()) {
  const lastMs = user.lastFailedLoginAt ? new Date(user.lastFailedLoginAt).getTime() : 0;
  const priorAttempts = now - lastMs > attemptResetMs() ? 0 : (user.failedLoginAttempts || 0);
  const attempts = priorAttempts + 1;

  const patch = { failedLoginAttempts: attempts, lastFailedLoginAt: new Date(now) };
  let justLocked = false;
  if (attempts >= threshold()) {
    patch.lockUntil = new Date(now + computeLockMs(attempts));
    justLocked = true;
  }

  await User.updateOne({ _id: user._id }, { $set: patch });
  Object.assign(user, patch);

  return { attempts, lockUntil: patch.lockUntil || null, justLocked };
}

/**
 * Clear all lockout state for a user (called on a successful login or a password reset).
 * @param {{ _id: any, failedLoginAttempts?: number, lockUntil?: Date|null, lastFailedLoginAt?: Date|null }} user
 * @returns {Promise<void>}
 */
async function clearFailedLogins(user) {
  if (!user) return;
  if (!user.failedLoginAttempts && !user.lockUntil && !user.lastFailedLoginAt) return;
  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, lockUntil: null, lastFailedLoginAt: null } }
  );
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastFailedLoginAt = null;
}

/**
 * Admin action: unlock one account by id.
 * @param {string} userId
 * @returns {Promise<{ userId: string, wasLocked: boolean }>}
 */
async function unlockAccount(userId) {
  const user = await User.findById(userId).select('+failedLoginAttempts +lockUntil +lastFailedLoginAt');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  const wasLocked = isAccountLocked(user);
  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, lockUntil: null, lastFailedLoginAt: null } }
  );
  return { userId: String(user._id), wasLocked };
}

/**
 * Admin view: accounts currently locked.
 * @param {number} [limit]
 * @returns {Promise<Array<{ _id: string, name: string, email: string, role: string, failedLoginAttempts: number, lockUntil: Date }>>}
 */
async function listLockedAccounts(limit = 100) {
  const rows = await User.find({ lockUntil: { $gt: new Date() } })
    .select('+failedLoginAttempts +lockUntil name email role')
    .sort({ lockUntil: -1 })
    .limit(Math.min(Math.max(1, limit), 500))
    .lean();
  return rows.map((u) => ({
    _id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    failedLoginAttempts: u.failedLoginAttempts || 0,
    lockUntil: u.lockUntil,
  }));
}

module.exports = {
  isAccountLocked,
  computeLockMs,
  registerFailedLogin,
  clearFailedLogins,
  unlockAccount,
  listLockedAccounts,
  // exposed for tests / diagnostics
  _config: { threshold, baseLockMs, maxLockMs, attemptResetMs },
};
