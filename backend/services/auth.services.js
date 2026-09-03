const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, PasswordResetToken, LoginOtpToken } = require('../models');
const { ChildProfile, ChildStats } = require('../models');
const mailService = require('./mail');
const legalContent = require('./legalContent.service');
const {
  isAccountLocked,
  registerFailedLogin,
  clearFailedLogins,
} = require('./loginLockout.service');

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
    console.error(
      `[Auth:loginOtp] Failed to send login OTP email to ${user.email}: ${error.message}`
    );
    throw error;
  }

  console.log(`[Auth:loginOtp] Admin login OTP email sent to ${user.email}`);
  return code;
};

/**
 * Build the standard post-auth payload (user + JWT + role extras).
 * @param {import('mongoose').Document} user - User document (password may be selected)
 * @returns {Promise<{ user: object, token: string, childProfiles?: object[] }>}
 */
const buildAuthenticatedSession = async (user) => {
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

  const token = generateToken(user._id);

  return {
    user: userData,
    token,
    ...additionalData,
  };
};

/**
 * Generate JWT Token
 * 
 * Creates a signed JWT token with user ID
 * 
 * @param {String} userId - User's MongoDB ID
 * @returns {String} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
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
const register = async (userData) => {
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

  // Public self-registration is ALWAYS a parent account. Never accept `role` from the caller —
  // that was RUK-SEC-002 (anyone could register as admin).
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'parent',
  });

  // Generate token
  const token = generateToken(user._id);

  // Get user data (exclude password)
  const userDataResponse = await User.findById(user._id).select('-password');

  return {
    user: userDataResponse,
    token,
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
const login = async (email, password) => {
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
    console.warn(
      `[Auth:lockout] Login attempt on locked account ${user.email} (locked until ${new Date(user.lockUntil).toISOString()})`
    );
    throw new Error('Invalid credentials');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    const { attempts, justLocked, lockUntil } = await registerFailedLogin(user);
    if (justLocked) {
      console.warn(
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

  // Admins: password OK → send OTP, do not issue JWT yet
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

  return buildAuthenticatedSession(user);
};

/**
 * Verify admin login OTP and issue JWT session.
 * @param {string} email
 * @param {string} code - 6-digit code
 * @returns {Promise<{ user: object, token: string }>}
 */
const verifyLoginOtp = async (email, code) => {
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

  return buildAuthenticatedSession(user);
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

  return {
    user,
    ...additionalData,
  };
};

/**
 * Logout Service
 * 
 * Currently, logout is handled client-side by removing token
 * This service can be extended for token blacklisting if needed
 * 
 * @param {String} userId - User's MongoDB ID
 * @returns {Object} Success message
 */
const logout = async (userId) => {
  // For now, logout is handled client-side
  // Future: Can implement token blacklisting here
  return {
    message: 'Logged out successfully',
  };
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
    console.error(
      `[Auth:forgotPassword] Failed to send reset code email to ${user.email}: ${error.message}`
    );
    throw error;
  }

  console.log(`[Auth:forgotPassword] Reset code email sent to ${user.email}`);
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
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const user = await User.findOne({ email: normalized }).select(
    '+password +failedLoginAttempts +lockUntil +lastFailedLoginAt'
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

  user.password = newPassword;
  await user.save();

  // A successful reset also clears any lockout — otherwise the user resets their password and is
  // still locked out (RUK-SEC-007).
  await clearFailedLogins(user);

  await PasswordResetToken.deleteOne({ _id: token._id });
};

module.exports = {
  register,
  login,
  verifyLoginOtp,
  resendLoginOtp,
  getCurrentUser,
  logout,
  generateToken,
  getTermsContent,
  forgotPassword,
  resetPassword,
  // exported for tests / reuse
  TOO_MANY_CODE_ATTEMPTS_MESSAGE,
  codesMatch,
};

