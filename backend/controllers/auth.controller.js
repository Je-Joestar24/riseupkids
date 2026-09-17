const authService = require('../services/auth.services');
const sessionService = require('../services/session.services');
const accountDeletionService = require('../services/accountDeletion.service');
const { subscribeToFlodesk } = require('../services/flodeskService');
const mailService = require('../services/mail');
const { assertPasswordPolicy } = require('../services/passwordPolicy.service');
const twoFactorService = require('../services/twoFactor.services');
const { issueStepUpToken } = require('../services/stepUp.service');
const {
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshToken,
  isMobileClient,
} = require('../config/refreshCookie');
const logger = require('../config/logger');

/** Chunk 9: request metadata attached to every new refresh-token session record. */
const sessionMeta = (req) => ({
  userAgent: req?.headers?.['user-agent'] || null,
  ip: req?.ip || null,
});

/**
 * Always sets the httpOnly refresh cookie (harmless if the caller is mobile and ignores it).
 * For a browser, the plaintext refresh token is then stripped out of the JSON body — it must only
 * ever leave the server as that cookie. Mobile has no cookie jar to rely on, so for a request
 * tagged `X-Client-Platform: mobile` the token is instead kept in the body, where the app is
 * responsible for storing it itself (see config/refreshCookie.js for the full rationale).
 */
const attachRefreshCookie = (req, res, result) => {
  if (result && result.refreshToken) {
    setRefreshCookie(res, result.refreshToken, sessionService.REFRESH_TOKEN_TTL_MS);
    if (isMobileClient(req)) {
      return result;
    }
    const { refreshToken, ...rest } = result;
    return rest;
  }
  return result;
};

/**
 * @desc    Register a new PARENT account and subscribe to Flodesk
 * @route   POST /api/auth/register
 * @access  Public
 *
 * SECURITY: this is a public, unauthenticated endpoint. It can only ever create a `parent`
 * account — any `role`/`linkedParent` sent in the body is ignored. Admin, teacher, and
 * content_creator accounts are created by an admin from the admin panel, never here.
 * Saves user to MongoDB, then calls Flodesk subscribe. Registration succeeds even if Flodesk fails.
 *
 * Request body:
 * { "name": "John Doe", "email": "john@example.com", "password": "password123" }
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    const result = await authService.register({ name, email, password }, sessionMeta(req));

    try {
      await subscribeToFlodesk(result.user.email);
    } catch (flodeskError) {
      logger.error('[Auth] Flodesk subscription failed after registration:', flodeskError.message);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: attachRefreshCookie(req, res, result),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed',
    });
  }
};

/**
 * @desc    Register a new user (admin or parent only)
 * @route   POST /api/auth/register
 * @access  Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * Note: Children are NOT User accounts. They are created as ChildProfile records only.
 * Children don't have passwords or tokens - parent logs in and selects a child.
 * Always creates a `parent` account — role cannot be chosen by the caller (see registerUser above).
 *
 * Request body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 */
const register = registerUser;

/**
 * @desc    Subscribe email to Flodesk only (no user registration). Use for testing or standalone signup.
 * @route   POST /api/auth/subscribe-flodesk
 * @access  Public (no Bearer)
 * Body: { "email": "user@example.com" }
 */
const subscribeFlodesk = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email',
      });
    }

    const result = await subscribeToFlodesk(email.trim());
    res.status(200).json({
      success: true,
      message: 'Subscribed to Flodesk successfully',
      data: result,
    });
  } catch (error) {
    logger.error('[Auth] subscribe-flodesk error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Flodesk subscription failed',
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 *
 * Admin users receive { requiresOtp: true, email } and must call verify-login-otp.
 * Other roles receive { user, token, ... } immediately.
 *
 * Request body: { "email": "...", "password": "..." }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const result = await authService.login(email, password, sessionMeta(req));

    if (result.requiresTwoFactor) {
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          requiresTwoFactor: true,
          email: result.email,
        },
      });
    }

    if (result.requiresOtp) {
      return res.status(200).json({
        success: true,
        message: result.message || 'A verification code has been sent to your email.',
        data: {
          requiresOtp: true,
          email: result.email,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: attachRefreshCookie(req, res, result),
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed',
    });
  }
};

/**
 * @desc    Complete login with a TOTP code (or a recovery code) when the account has 2FA enabled
 * @route   POST /api/auth/2fa/login-verify
 * @access  Public
 * Body: { "email": "...", "code": "123456" | "ABCDE-FGHIJ" }
 */
const verifyLoginTwoFactor = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and verification code',
      });
    }

    const result = await authService.verifyLoginTwoFactor(email, code, sessionMeta(req));

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: attachRefreshCookie(req, res, result),
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid verification code',
    });
  }
};

/**
 * @desc    Verify admin login OTP and issue JWT
 * @route   POST /api/auth/verify-login-otp
 * @access  Public
 * Body: { "email": "...", "code": "123456" }
 */
const verifyLoginOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and verification code',
      });
    }

    const result = await authService.verifyLoginOtp(email, code, sessionMeta(req));

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: attachRefreshCookie(req, res, result),
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired verification code',
    });
  }
};

/**
 * @desc    Resend admin login OTP
 * @route   POST /api/auth/resend-login-otp
 * @access  Public
 * Body: { "email": "..." }
 */
const resendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const result = await authService.resendLoginOtp(email.trim());

    res.status(200).json({
      success: true,
      message: 'A new verification code has been sent to your email.',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Unable to resend verification code',
    });
  }
};

/**
 * @desc    Start (or restart) TOTP enrollment — returns a QR code to scan
 * @route   POST /api/auth/2fa/setup
 * @access  Private
 */
const setupTwoFactor = async (req, res) => {
  try {
    const { secret, otpauthUrl, qrDataUrl } = await twoFactorService.startEnrollment(
      req.user._id,
      req.user.email
    );
    res.status(200).json({ success: true, data: { secret, otpauthUrl, qrDataUrl } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to start two-factor setup' });
  }
};

/**
 * @desc    Confirm TOTP enrollment with a code from the authenticator app — enables 2FA and
 *          returns a one-time batch of recovery codes (never retrievable again after this)
 * @route   POST /api/auth/2fa/verify-setup
 * @access  Private
 * Body: { "code": "123456" }
 */
const verifySetupTwoFactor = async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) {
      return res.status(400).json({ success: false, message: 'Please provide the 6-digit code' });
    }
    const { recoveryCodes } = await twoFactorService.confirmEnrollment(req.user._id, code);
    res.status(200).json({
      success: true,
      message: 'Two-factor authentication is now enabled.',
      data: { recoveryCodes },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to confirm two-factor setup' });
  }
};

/**
 * @desc    Disable TOTP — requires the current password AND a valid code, so a hijacked session
 *          alone can't turn off 2FA
 * @route   POST /api/auth/2fa/disable
 * @access  Private
 * Body: { "password": "...", "code": "123456" | "ABCDE-FGHIJ" }
 */
const disableTwoFactor = async (req, res) => {
  try {
    const { password, code } = req.body || {};
    if (!password || !code) {
      return res.status(400).json({ success: false, message: 'Please provide your password and a code' });
    }

    const { User } = require('../models');
    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    // Chunk 10 bug fix: route by classifyCode(), not by post-strip digit count — see
    // auth.services.js#verifyLoginTwoFactor for why the digit-count check misroutes real
    // recovery codes.
    const kind = twoFactorService.classifyCode(code);
    const isValid =
      kind === 'totp'
        ? await twoFactorService.verifyTotp(req.user._id, code)
        : await twoFactorService.verifyRecoveryCode(req.user._id, code);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid verification code' });
    }

    await twoFactorService.disable(req.user._id);
    res.status(200).json({ success: true, message: 'Two-factor authentication has been disabled.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to disable two-factor authentication' });
  }
};

/**
 * @desc    Replace the recovery-code batch — requires a valid TOTP code; the old batch is
 *          invalidated immediately
 * @route   POST /api/auth/2fa/recovery-codes
 * @access  Private
 * Body: { "code": "123456" }
 */
const regenerateRecoveryCodes = async (req, res) => {
  try {
    const { code } = req.body || {};
    const isValid = await twoFactorService.verifyTotp(req.user._id, code);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid verification code' });
    }
    const recoveryCodes = await twoFactorService.regenerateRecoveryCodes(req.user._id);
    res.status(200).json({ success: true, data: { recoveryCodes } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to regenerate recovery codes' });
  }
};

/**
 * @desc    Step-up re-authentication for sensitive actions — verify a fresh TOTP/recovery code
 *          and get back a short-lived token to attach to that one sensitive request
 * @route   POST /api/auth/step-up-verify
 * @access  Private (requires 2FA already enabled)
 * Body: { "code": "123456" | "ABCDE-FGHIJ" }
 */
const stepUpVerify = async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) {
      return res.status(400).json({ success: false, message: 'Please provide a code' });
    }

    const enabled = await twoFactorService.isEnabled(req.user._id);
    if (!enabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication must be enabled to perform this action.',
      });
    }

    // Chunk 10 bug fix: route by classifyCode(), not by post-strip digit count — see
    // auth.services.js#verifyLoginTwoFactor for why the digit-count check misroutes real
    // recovery codes.
    const kind = twoFactorService.classifyCode(code);
    const isValid =
      kind === 'totp'
        ? await twoFactorService.verifyTotp(req.user._id, code)
        : await twoFactorService.verifyRecoveryCode(req.user._id, code);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid verification code' });
    }

    const stepUpToken = issueStepUpToken(req.user._id);
    res.status(200).json({ success: true, data: { stepUpToken } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Step-up verification failed' });
  }
};

/**
 * @desc    Current 2FA status for the logged-in user
 * @route   GET /api/auth/2fa/status
 * @access  Private
 */
const getTwoFactorStatus = async (req, res) => {
  try {
    const enabled = await twoFactorService.isEnabled(req.user._id);
    const remainingRecoveryCodes = enabled
      ? await twoFactorService.countRemainingRecoveryCodes(req.user._id)
      : 0;
    res.status(200).json({ success: true, data: { enabled, remainingRecoveryCodes } });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to load two-factor status' });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 * 
 * @param {Object} req - Express request object (must have req.user from protect middleware)
 * @param {Object} res - Express response object
 */
const getMe = async (req, res) => {
  try {
    // req.user is set by protect middleware
    const userId = req.user._id;

    // Call service
    const result = await authService.getCurrentUser(userId);

    res.status(200).json({
      success: true,
      message: 'User data retrieved successfully',
      data: result,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || 'Failed to retrieve user data',
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * Note: Logout is primarily handled client-side by removing token
 * This endpoint can be used for server-side cleanup if needed
 */
const logout = async (req, res) => {
  try {
    const result = await authService.logout(getRefreshToken(req));
    clearRefreshCookie(res);

    res.status(200).json({
      success: true,
      message: result.message || 'Logged out successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Logout failed',
    });
  }
};

/**
 * @desc    "Sign Out Everywhere" — revoke every active session for the current user
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
const logoutAll = async (req, res) => {
  try {
    const result = await authService.logoutAll(req.user._id);
    clearRefreshCookie(res);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to sign out of all devices',
    });
  }
};

/**
 * @desc    Exchange the refresh token for a new short-lived access token (rotates the refresh
 *          token too). Called by the web axios interceptor on a 401, and by the mobile app on
 *          launch/foreground and its own 401s. Authenticated by the refresh token itself — a
 *          browser sends it via the httpOnly cookie, the mobile app sends it explicitly in the
 *          body (tagged `X-Client-Platform: mobile`, see config/refreshCookie.js) — never a
 *          Bearer access token, since there may not be a valid one at this point.
 * @route   POST /api/auth/refresh
 * @access  Public (authenticated by the refresh token: cookie for web, body for mobile)
 */
const refresh = async (req, res) => {
  try {
    const plainToken = getRefreshToken(req);
    if (!plainToken) {
      return res.status(401).json({ success: false, message: 'No session to refresh.' });
    }

    const result = await sessionService.rotateRefreshToken(plainToken, sessionMeta(req));
    if (!result.ok) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    const { User } = require('../models');
    const user = await User.findById(result.userId).select('role isActive tokenVersion');
    if (!user || !user.isActive) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    setRefreshCookie(res, result.plainToken, sessionService.REFRESH_TOKEN_TTL_MS);
    const token = authService.generateToken(
      user._id,
      user.tokenVersion || 0,
      authService.accessTokenExpiryForRole(user.role)
    );

    const data = { token };
    if (isMobileClient(req)) {
      // Mobile has no cookie jar — it must receive the newly rotated refresh token explicitly
      // and store it itself, or the next refresh attempt has nothing to present.
      data.refreshToken = result.plainToken;
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    // A DB/unexpected error here must be a 500, not a 401 — see middleware/auth.js for why
    // conflating the two is dangerous (a client-side logout on a transient server error).
    logger.error('[Auth] /refresh error:', error);
    res.status(500).json({ success: false, message: 'Failed to refresh session.' });
  }
};

/**
 * @desc    List active sessions (devices) for the current user
 * @route   GET /api/auth/sessions
 * @access  Private
 */
const getSessions = async (req, res) => {
  try {
    const sessions = await sessionService.listActiveSessions(req.user._id);
    res.status(200).json({ success: true, data: { sessions } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load sessions.' });
  }
};

/**
 * @desc    Revoke one session by id — only ever the caller's own (ownership enforced in the
 *          service query, not just by controller-level filtering)
 * @route   DELETE /api/auth/sessions/:id
 * @access  Private
 */
const revokeSession = async (req, res) => {
  try {
    const revoked = await sessionService.revokeSessionById(req.user._id, req.params.id);
    if (!revoked) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    res.status(200).json({ success: true, message: 'Session revoked.' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to revoke session.' });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/update-profile
 * @access  Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name } = req.body;

    // Get user
    const { User } = require('../models');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields
    if (name) user.name = name;
    // RUK-SEC-021: email is intentionally NOT editable through this endpoint (or any other,
    // currently) — a self-service email change with no re-verification would let a compromised
    // session silently change the account's email, then use forgot-password against the new
    // address to seize the account, with no notification anywhere. Any `email` in the request
    // body is ignored; changing an account's email is an admin/support-assisted action for now.

    await user.save();

    // Get updated user (exclude password)
    const updatedUser = await User.findById(userId).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update profile',
    });
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password',
      });
    }

    // Chunk 10: minimum length + breached-password check, applied everywhere a password is set.
    try {
      await assertPasswordPolicy(newPassword);
    } catch (policyError) {
      return res.status(400).json({ success: false, message: policyError.message });
    }

    // Get user with password
    const { User } = require('../models');
    const user = await User.findById(userId).select('+password +tokenVersion');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password. Chunk 9: also invalidate every existing session — otherwise a token
    // issued before this change (and any account takeover it may have been part of) keeps
    // working until it naturally expires.
    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await sessionService.revokeAllForUser(user._id);
    clearRefreshCookie(res);

    // Chunk 10: notify + audit-log every successful change — the user's own signal something is
    // wrong if they didn't do it, and a record for support/incident response either way.
    logger.warn({ userId: String(user._id), email: user.email }, '[Auth:audit] Password changed');
    try {
      await mailService.sendPasswordChangedNotification({ to: user.email });
    } catch (mailError) {
      logger.error({ err: mailError, userId: String(user._id) }, '[Auth] Failed to send password-changed notification');
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. For security, you have been signed out everywhere.',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to change password',
    });
  }
};

/**
 * @desc    Get Terms & Conditions content (public, for display in modal)
 * @route   GET /api/auth/terms
 * @access  Public
 */
const getTerms = async (req, res) => {
  try {
    const result = await authService.getTermsContent();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load terms',
    });
  }
};

/**
 * @desc    Forgot password – request a 6-digit reset code by email.
 * @route   POST /api/auth/forgot-password
 * @access  Public
 * Body: { "email": "user@example.com" }
 * Returns 404 when no user exists for the email.
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }
    await authService.forgotPassword(email.trim());
    res.status(200).json({
      success: true,
      message: 'A reset code has been sent to your email.',
    });
  } catch (error) {
    const isNotFound = error.message === 'No account exists with this email address.';
    res.status(isNotFound ? 404 : 400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
};

/**
 * @desc    Reset password with email + 6-digit code + new password.
 * @route   POST /api/auth/reset-password
 * @access  Public
 * Body: { "email": "user@example.com", "code": "123456", "newPassword": "newSecurePassword" }
 */
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, reset code, and new password',
      });
    }
    await authService.resetPassword(email, code, newPassword);
    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Invalid or expired reset code',
    });
  }
};

/**
 * @desc    Request parent account deletion (revokes access immediately)
 * @route   POST /api/auth/delete-account
 * @access  Private (parent)
 */
const deleteAccount = async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parent accounts can delete their account from this screen',
      });
    }

    const { password, confirmText } = req.body || {};
    const requesterIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;

    const result = await accountDeletionService.requestParentAccountDeletion(req.user._id, {
      password,
      confirmText,
      requesterIp,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit account deletion request',
    });
  }
};

module.exports = {
  register,
  registerUser,
  subscribeFlodesk,
  login,
  verifyLoginOtp,
  verifyLoginTwoFactor,
  resendLoginOtp,
  getMe,
  logout,
  logoutAll,
  refresh,
  getSessions,
  revokeSession,
  updateProfile,
  changePassword,
  deleteAccount,
  getTerms,
  forgotPassword,
  resetPassword,
  setupTwoFactor,
  verifySetupTwoFactor,
  disableTwoFactor,
  regenerateRecoveryCodes,
  getTwoFactorStatus,
  stepUpVerify,
};

