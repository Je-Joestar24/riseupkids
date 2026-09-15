const express = require('express');
const router = express.Router();
const {
  register,
  registerUser,
  subscribeFlodesk,
  login,
  verifyLoginOtp,
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
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  refreshLimiter,
} = require('../middleware/rateLimit');

/**
 * Authentication Routes
 *
 * Base path: /api/auth
 *
 * Public routes:
 * - POST /register - Register new user
 * - POST /login - Login user (admins get requiresOtp challenge)
 * - POST /verify-login-otp - Complete admin login with 6-digit OTP
 * - POST /resend-login-otp - Resend admin login OTP
 * - POST /forgot-password - Request reset code by email
 * - POST /reset-password - Reset password with email + code + newPassword
 *
 * Protected routes (require authentication):
 * - GET /me - Get current user data
 * - POST /logout - Logout user
 * - PUT /update-profile - Update user profile
 * - PUT /change-password - Change user password
 *
 * Public POST routes are per-IP rate limited (RUK-SEC-007) — see middleware/rateLimit.js.
 */

// Public routes (rate limited)
router.post('/register', registerLimiter, registerUser);
router.post('/subscribe-flodesk', registerLimiter, subscribeFlodesk);
router.post('/login', loginLimiter, login);
router.post('/verify-login-otp', loginLimiter, verifyLoginOtp);
router.post('/resend-login-otp', passwordResetLimiter, resendLoginOtp);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.get('/terms', getTerms);

// Authenticated by the httpOnly refresh cookie, not a Bearer token — no `protect` (Chunk 9).
router.post('/refresh', refreshLimiter, refresh);

// Logout only needs the refresh cookie (not `protect`) — it must still work to clean up a
// session even when the access token has already expired, which is often exactly when a user
// reaches for "log out".
router.post('/logout', logout);

// Protected routes (require authentication)
router.get('/me', protect, getMe);
router.post('/logout-all', protect, logoutAll);
router.get('/sessions', protect, getSessions);
router.delete('/sessions/:id', protect, revokeSession);
router.put('/update-profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/delete-account', protect, deleteAccount);

module.exports = router;

