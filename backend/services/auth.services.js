const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, PasswordResetToken, LoginOtpToken } = require('../models');
const { ChildProfile, ChildStats } = require('../models');
const mailService = require('./mail');
const legalContent = require('./legalContent.service');
const logger = require('../config/logger');
const {
  isAccountLocked,
  registerFailedLogin,
  clearFailedLogins,
} = require('./loginLockout.service');
const sessionService = require('./session.services');
const twoFactorService = require('./twoFactor.services');
const { assertPasswordPolicy } = require('./passwordPolicy.service');

/** Expiry for admin login OTP codes (10 minutes) */
const LOGIN_OTP_EXPIRY_MS = 10 * 60 * 1000;

/** Expiry for password-reset OTP codes (16 minutes) */
const RESET_CODE_EXPIRY_MS = 16 * 60 * 1000;

/** Message returned once a code has been guessed wrong too many times (RUK-SEC-007). */
const TOO_MANY_CODE_ATTEMPTS_MESSAGE = 'Too many attempts. Please request a new code.';

/** Parse a positive-integer env var, else the fallback. */
const envInt = (name, fallback) => {
  const n = parseInt(process.env[name] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Wrong-guess caps before the 6-digit code is destroyed (RUK-SEC-007). Env-tunable. */
const maxLoginOtpAttempts = () => envInt('LOGIN_OTP_MAX_ATTEMPTS', 5);
const maxResetCodeAttempts = () => envInt('PASSWORD_RESET_CODE_MAX_ATTEMPTS', 5);

/**
 * Constant-time 6-digit code comparison (avoids leaking match progress via response timing).
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
const codesMatch = (a, b) => {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length > 0 && ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

/**
 * Normalize a 6-digit OTP from user input (strips non-digits).
 * @param {unknown} code
 * @returns {string}
 */
const normalizeOtpCode = (code) =>
  (code || '').toString().trim().replace(/\D/g, '').slice(0, 6);

/**
 * Create a fresh 6-digit login OTP for an admin and email it.
 * @param {import('mongoose').Document} user
 * @returns {Promise<string>} The generated code (for tests / logging only)
 */
const issueAdminLoginOtp = async (user) => {
  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + LOGIN_OTP_EXPIRY_MS);

  await LoginOtpToken.deleteMany({ userId: user._id });
  await LoginOtpToken.create({
    userId: user._id,
    code,
    expiresAt,
  });

  try {
    await mailService.sendLoginOtpCode({ to: user.email, code });
  } catch (error) {
    logger.error({ userId: user._id, err: error }, '[Auth:loginOtp] failed to send login OTP email');
    throw error;
  }

  logger.info({ userId: user._id }, '[Auth:loginOtp] login OTP email sent');
  return code;
};

/**
 * Build the standard post-auth payload (user + JWT + role extras).
 * @param {import('mongoose').Document} user - User document (password may be selected)
 * @param {{ deviceLabel?: string, userAgent?: string, ip?: string }} [meta] - for the refresh
 *   token's session record (Chunk 9)
 * @returns {Promise<{ user: object, token: string, refreshToken: string, childProfiles?: object[] }>}
 */
const buildAuthenticatedSession = async (user, meta = {}) => {
  const userData = await User.findById(user._id).select('-password');
  let additionalData = {};

  if (user.role === 'parent') {
    const childProfiles = await ChildProfile.find({ parent: user._id, isActive: true }).lean();

    const childProfilesWithStats = await Promise.all(
      childProfiles.map(async (child) => {
        const stats = await ChildStats.findOne({ child: child._id })
          .select('totalStars currentStreak totalBadges badges')
          .lean();

        return {
          ...child,
          stats: stats || {
            totalStars: 0,
            currentStreak: 0,
            totalBadges: 0,
            badges: [],
          },
        };
      })
    );

    additionalData.childProfiles = childProfilesWithStats;
  }

  // Chunk 10: TOTP is required for admin accounts. There is no backend route-level block for
  // this (that would need every admin-only route/test retrofitted) — instead the authoritative
  // signal is this flag, and the frontend router refuses to render anything but the mandatory
  // enrollment screen for an admin session carrying it. Every path that mints an admin session
  // (direct login, admin email-OTP fallback, TOTP-code completion) goes through this function.
  if (user.role === 'admin') {
    additionalData.twoFactorEnrollmentRequired = !(await twoFactorService.isEnabled(user._id));
  }

  // tokenVersion is select:false — a fresh, minimal lookup rather than trusting the caller's
  // `user` doc to have it selected (most callers don't select it, and it must never leak into
  // `userData`/the JSON response, which is why it's not just added to the select above).
  const versionDoc = await User.findById(user._id).select('tokenVersion');
  const token = generateToken(user._id, versionDoc?.tokenVersion || 0, accessTokenExpiryForRole(user.role));
  const { plainToken: refreshToken } = await sessionService.issueRefreshToken(user._id, meta);

  return {
    user: userData,
    token,
    refreshToken,
    ...additionalData,
  };
};

/**
 * Generate JWT Token
 *
 * Creates a signed JWT token with user ID and the token-version claim used for early
 * invalidation (Chunk 9 — see middleware/auth.js). `tokenVersion` defaults to 0 so existing call
 * sites that don't pass it (post-payment auto-login in checkout/stripe/pagseguro controllers)
 * keep working unchanged — 0 is also every user's default value.
 *
 * @param {String} userId - User's MongoDB ID
 * @param {Number} [tokenVersion=0]
 * @param {String} [expiresIn] - defaults to JWT_EXPIRE (or role-specific, see accessTokenExpiryForRole)
 * @returns {String} JWT token
 */
const generateToken = (userId, tokenVersion = 0, expiresIn) => {
  return jwt.sign({ id: userId, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: expiresIn || process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * Chunk 9 interim step: shorten privileged-role token lifespan now, ahead of the full
 * refresh-token rollout landing on the web frontend. Parent/content_creator keep the existing
 * long-lived token for now — a short TTL with no working silent-refresh on the client would just
 * log them out with no way to recover until Phase B ships.
 * @param {String} role
 * @returns {String}
 */
const accessTokenExpiryForRole = (role) => {
  if (role === 'admin') return process.env.JWT_EXPIRE_ADMIN || '15m';
  if (role === 'teacher') return process.env.JWT_EXPIRE_TEACHER || '1h';
  return process.env.JWT_EXPIRE || '7d';
};

/**
 * Register/Signup Service
 *
 * Creates a new PARENT account via public self-registration.
 * SECURITY: public registration can only ever create a `parent` account — the role is never
 * taken from client input. Admin, teacher, and content_creator accounts can only be created by
 * an existing admin (see `parents.services.js` / `teachers.controller.js`).
 * Note: Children are NOT User records - they are created as ChildProfile records only
 *
 * @param {Object} userData - User registration data
 * @param {String} userData.name - User's full name
 * @param {String} userData.email - User's email address
 * @param {String} userData.password - User's password
 * @returns {Object} User object with token
 * @throws {Error} If validation fails or user already exists
 */
const register = async (userData, meta = {}) => {
  const { name, email, password } = userData;

  // Validate required fields
  if (!name || !email || !password) {
    throw new Error('Please provide name, email, and password');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  // Chunk 10: minimum length + breached-password check, applied everywhere a password is set.
  await assertPasswordPolicy(password);

  // Public self-registration is ALWAYS a parent account. Never accept `role` from the caller —
  // that was RUK-SEC-002 (anyone could register as admin).
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'parent',
  });

  // Generate token — freshly-created user, tokenVersion is always 0.
  const token = generateToken(user._id, 0, accessTokenExpiryForRole(user.role));
  const { plainToken: refreshToken } = await sessionService.issueRefreshToken(user._id, meta);

  // Get user data (exclude password)
  const userDataResponse = await User.findById(user._id).select('-password');

  return {
    user: userDataResponse,
    token,
    refreshToken,
  };
};

/**
 * Login Service
 *
 * Authenticates user and returns token.
 * Admin users must complete a 6-digit email OTP before a JWT is issued.
 *
 * @param {String} email - User's email
 * @param {String} password - User's password
 * @returns {Object} Session payload, or { requiresOtp: true, email } for admins
 * @throws {Error} If credentials are invalid
 */
const login = async (email, password, meta = {}) => {
  if (!email || !password) {
    throw new Error('Please provide email and password');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password +failedLoginAttempts +lockUntil +lastFailedLoginAt'
  );

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account is inactive. Please contact administrator.');
  }

  // RUK-SEC-007: reject a locked account BEFORE checking the password, with the same generic
  // error as a wrong password so it can't be probed. Real reason is logged, not returned.
  if (isAccountLocked(user)) {
    logger.warn(
      `[Auth:lockout] Login attempt on locked account ${user.email} (locked until ${new Date(user.lockUntil).toISOString()})`
    );
    throw new Error('Invalid credentials');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    const { attempts, justLocked, lockUntil } = await registerFailedLogin(user);
    if (justLocked) {
      logger.warn(
        `[Auth:lockout] Account ${user.email} locked after ${attempts} failed login attempts` +
          (lockUntil ? ` (until ${new Date(lockUntil).toISOString()})` : '')
      );
    }
    throw new Error('Invalid credentials');
  }

  // Correct password — wipe any accumulated failed-attempt / lock state.
  await clearFailedLogins(user);

  if (user.role === 'child') {
    throw new Error('Children do not have login accounts. Please login as a parent and select a child profile.');
  }

  // Chunk 10: password OK → if this account has TOTP enrolled (required for admin, optional for
  // parent/teacher), it takes priority over the email-OTP fallback below — do not issue a JWT yet.
  if (await twoFactorService.isEnabled(user._id)) {
    return {
      requiresTwoFactor: true,
      email: user.email,
      message: 'Enter the code from your authenticator app to finish signing in.',
    };
  }

  // Admins without TOTP enrolled yet: password OK → send the (fallback) email OTP, do not issue
  // a JWT yet. Once logged in they're blocked from admin actions until they enroll TOTP — see
  // the tokenVersion-adjacent check in authorize() in middleware/auth.js.
  if (user.role === 'admin') {
    await issueAdminLoginOtp(user);
    return {
      requiresOtp: true,
      email: user.email,
      message: 'A verification code has been sent to your email.',
    };
  }

  user.lastLogin = new Date();
  await user.save();

  return buildAuthenticatedSession(user, meta);
};

/**
 * Verify a TOTP code (or a recovery code) to complete login when the account has 2FA enabled.
 * Accepts either: a 6-digit code is tried as TOTP first; anything else is tried as a recovery
 * code, so the frontend doesn't need a separate "which kind of code" selector.
 * @param {string} email
 * @param {string} code
 * @param {{ deviceLabel?: string, userAgent?: string, ip?: string }} [meta]
 * @returns {Promise<{ user: object, token: string, refreshToken: string }>}
 */
const verifyLoginTwoFactor = async (email, code, meta = {}) => {
  const normalized = (email || '').toString().trim().toLowerCase();
  if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new Error('Please provide a valid email address');
  }

  const user = await User.findOne({ email: normalized });
  if (!user || !user.isActive) {
    throw new Error('Invalid verification code');
  }

  // Chunk 10 bug fix: routing must be based on the RAW code's shape (classifyCode), not on how
  // many digit characters happen to remain after stripping — a hex recovery code frequently
  // strips down to exactly 6 digits by coincidence and would otherwise get misrouted to TOTP
  // verification, where it always fails (caught by auth.twoFactorLogin.e2e.test.js).
  const kind = twoFactorService.classifyCode(code);
  const isValid =
    kind === 'totp'
      ? await twoFactorService.verifyTotp(user._id, code)
      : await twoFactorService.verifyRecoveryCode(user._id, code);

  if (!isValid) {
    throw new Error('Invalid verification code');
  }

  user.lastLogin = new Date();
  await user.save();

  return buildAuthenticatedSession(user, meta);
};

/**
 * Verify admin login OTP and issue JWT session.
 * @param {string} email
 * @param {string} code - 6-digit code
 * @param {{ deviceLabel?: string, userAgent?: string, ip?: string }} [meta]
 * @returns {Promise<{ user: object, token: string, refreshToken: string }>}
 */
const verifyLoginOtp = async (email, code, meta = {}) => {
  const normalized = (email || '').toString().trim().toLowerCase();
  const codeStr = normalizeOtpCode(code);

  if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new Error('Please provide a valid email address');
  }
  if (codeStr.length !== 6) {
    throw new Error('Invalid or expired verification code');
  }

  const user = await User.findOne({ email: normalized });
  if (!user || user.role !== 'admin' || !user.isActive) {
    throw new Error('Invalid or expired verification code');
  }

  // Find the active challenge by user (NOT by code) so we can count wrong guesses (RUK-SEC-007).
  // issueAdminLoginOtp deleteMany's prior tokens, so there is at most one active row per user.
  const token = await LoginOtpToken.findOne({
    userId: user._id,
    expiresAt: { $gt: new Date() },
  });
  if (!token) {
    throw new Error('Invalid or expired verification code');
  }

  if (!codesMatch(token.code, codeStr)) {
    const attempts = (token.attempts || 0) + 1;
    if (attempts >= maxLoginOtpAttempts()) {
      await LoginOtpToken.deleteOne({ _id: token._id });
      throw new Error(TOO_MANY_CODE_ATTEMPTS_MESSAGE);
    }
    await LoginOtpToken.updateOne({ _id: token._id }, { $set: { attempts } });
    throw new Error('Invalid or expired verification code');
  }

  await LoginOtpToken.deleteOne({ _id: token._id });

  user.lastLogin = new Date();
  await user.save();

  return buildAuthenticatedSession(user, meta);
};

/**
 * Resend admin login OTP (user must already have passed password check recently
 * by having an existing or freshly replaced challenge). Requires email only after
 * a prior successful password login that created a challenge — we allow resend
 * when an active admin account exists (same email enumeration tradeoff as forgot-password).
 * @param {string} email
 * @returns {Promise<{ sent: boolean, email: string }>}
 */
const resendLoginOtp = async (email) => {
  const normalized = (email || '').toString().trim().toLowerCase();
  if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new Error('Please provide a valid email address');
  }

  const user = await User.findOne({ email: normalized });
  if (!user || user.role !== 'admin' || !user.isActive) {
    throw new Error('Unable to resend verification code');
  }

  // Require an existing (possibly expired) challenge so random emails cannot spam admins
  const existing = await LoginOtpToken.findOne({ userId: user._id });
  if (!existing) {
    throw new Error('Unable to resend verification code');
  }

  await issueAdminLoginOtp(user);
  return { sent: true, email: user.email };
};

/**
 * Get Current User Service
 * 
 * Returns current authenticated user with all related data
 * 
 * @param {String} userId - User's MongoDB ID
 * @returns {Object} User object with all related data
 * @throws {Error} If user not found
 */
const getCurrentUser = async (userId) => {
  // Get user without password
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.isActive) {
    throw new Error('Account is inactive');
  }

  // Children don't have User accounts
  if (user.role === 'child') {
    throw new Error('Children do not have User accounts. They are accessed through ChildProfile records.');
  }

  // Get additional data based on role
  let additionalData = {};

  // If parent, get child profiles with stats
  if (user.role === 'parent') {
    const childProfiles = await ChildProfile.find({ parent: user._id, isActive: true })
      .populate('currentJourney', 'title description')
      .populate('currentLesson', 'title description')
      .lean();
    
    // Populate stats for each child
    const childProfilesWithStats = await Promise.all(
      childProfiles.map(async (child) => {
        const stats = await ChildStats.findOne({ child: child._id })
          .select('totalStars currentStreak totalBadges badges')
          .lean();
        
        return {
          ...child,
          stats: stats || {
            totalStars: 0,
            currentStreak: 0,
            totalBadges: 0,
            badges: [],
          },
        };
      })
    );
    
    additionalData.childProfiles = childProfilesWithStats;
  }

  // Chunk 10: re-confirmed on every /me call (not just at login) — covers the case where an
  // admin's session started before 2FA was required of them, or they disabled it mid-session.
  if (user.role === 'admin') {
    additionalData.twoFactorEnrollmentRequired = !(await twoFactorService.isEnabled(user._id));
  }

  return {
    user,
    ...additionalData,
  };
};

/**
 * Logout Service (Chunk 9)
 *
 * Revokes the refresh token behind the current session so it can no longer be used to mint new
 * access tokens. The (still short-lived) access token already issued naturally expires on its
 * own — there is no access-token blacklist, only refresh-token revocation, matching the plan's
 * short-access/long-refresh design. Safe to call with a missing/already-revoked refresh token —
 * a logout must never fail because the cookie was stale.
 *
 * @param {string} [refreshTokenPlain] - the plaintext refresh token from the httpOnly cookie
 * @returns {Promise<{ message: string }>}
 */
const logout = async (refreshTokenPlain) => {
  await sessionService.revokeRefreshToken(refreshTokenPlain);
  return {
    message: 'Logged out successfully',
  };
};

/**
 * "Sign Out Everywhere" (Chunk 9) — revoke every active refresh token for the user.
 * @param {string} userId
 * @returns {Promise<{ message: string }>}
 */
const logoutAll = async (userId) => {
  await sessionService.revokeAllForUser(userId);
  return { message: 'Signed out of all devices.' };
};

/**
 * Get current Terms & Conditions content (public).
 * Placeholder text until client provides final copy; can later be stored in DB or CMS.
 *
 * @returns {Object} { content: string }
 */
const getTermsContent = async () => legalContent.getTermsContent();

/**
 * Forgot password: user must exist; generate 6-digit code, store with expiry, send email.
 * @param {string} email - User's email
 * @returns {Promise<{ sent: boolean }>}
 * @throws {Error} When email is invalid or no account exists for that email
 */
const forgotPassword = async (email) => {
  const normalized = (email || '').toString().trim().toLowerCase();
  if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new Error('Please provide a valid email address');
  }

  const user = await User.findOne({ email: normalized });
  if (!user) {
    throw new Error('No account exists with this email address.');
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + RESET_CODE_EXPIRY_MS);

  await PasswordResetToken.deleteMany({ userId: user._id });
  await PasswordResetToken.create({
    userId: user._id,
    code,
    expiresAt,
  });

  try {
    await mailService.sendResetCode({ to: user.email, code });
  } catch (error) {
    logger.error(
      `[Auth:forgotPassword] Failed to send reset code email to ${user.email}: ${error.message}`
    );
    throw error;
  }

  logger.info(`[Auth:forgotPassword] Reset code email sent to ${user.email}`);
  return { sent: true };
};

/**
 * Reset password with email + code + newPassword. Validates code (match + not expired), updates password, deletes token.
 * @param {string} email
 * @param {string} code - 6-digit code
 * @param {string} newPassword
 */
const resetPassword = async (email, code, newPassword) => {
  const normalized = (email || '').toString().trim().toLowerCase();
  const codeStr = normalizeOtpCode(code);
  if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new Error('Please provide a valid email address');
  }
  if (codeStr.length !== 6) {
    throw new Error('Invalid or expired reset code');
  }

  const user = await User.findOne({ email: normalized }).select(
    '+password +failedLoginAttempts +lockUntil +lastFailedLoginAt +tokenVersion'
  );
  if (!user) {
    throw new Error('Invalid or expired reset code');
  }

  // Find the active reset code by user (NOT by code) so we can count wrong guesses (RUK-SEC-007).
  // forgotPassword deleteMany's prior tokens, so there is at most one active row per user.
  const token = await PasswordResetToken.findOne({
    userId: user._id,
    expiresAt: { $gt: new Date() },
  });
  if (!token) {
    throw new Error('Invalid or expired reset code');
  }

  if (!codesMatch(token.code, codeStr)) {
    const attempts = (token.attempts || 0) + 1;
    if (attempts >= maxResetCodeAttempts()) {
      await PasswordResetToken.deleteOne({ _id: token._id });
      throw new Error(TOO_MANY_CODE_ATTEMPTS_MESSAGE);
    }
    await PasswordResetToken.updateOne({ _id: token._id }, { $set: { attempts } });
    throw new Error('Invalid or expired reset code');
  }

  // Chunk 10: validated only once the reset code itself is confirmed genuine — avoids doing a
  // network round-trip to HIBP for every wrong-code guess an attacker might throw at this endpoint.
  await assertPasswordPolicy(newPassword);

  user.password = newPassword;
  // Chunk 9: a password reset must invalidate every existing session, not just future logins —
  // otherwise a still-unexpired token from before the reset (and any account takeover it may have
  // been part of) keeps working for up to its full remaining lifetime.
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await sessionService.revokeAllForUser(user._id);

  // A successful reset also clears any lockout — otherwise the user resets their password and is
  // still locked out (RUK-SEC-007).
  await clearFailedLogins(user);

  await PasswordResetToken.deleteOne({ _id: token._id });

  // Chunk 10: notify + audit-log every successful reset — the user's own signal that something
  // is wrong if they didn't request it, and a record for support/incident response either way.
  logger.warn({ userId: String(user._id), email: user.email }, '[Auth:audit] Password reset completed');
  try {
    await mailService.sendPasswordChangedNotification({ to: user.email });
  } catch (error) {
    logger.error({ err: error, userId: String(user._id) }, '[Auth] Failed to send password-changed notification');
  }
};

module.exports = {
  register,
  login,
  verifyLoginOtp,
  verifyLoginTwoFactor,
  resendLoginOtp,
  getCurrentUser,
  logout,
  logoutAll,
  generateToken,
  accessTokenExpiryForRole,
  getTermsContent,
  forgotPassword,
  resetPassword,
  // exported for tests / reuse
  TOO_MANY_CODE_ATTEMPTS_MESSAGE,
  codesMatch,
};

