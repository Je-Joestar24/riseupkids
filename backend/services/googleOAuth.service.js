const { google } = require('googleapis');
const crypto = require('crypto');
const GoogleIntegration = require('../models/GoogleIntegration');
const User = require('../models/User');

/**
 * Google OAuth Service
 * 
 * Handles OAuth 2.0 flow for Google Calendar API integration
 * Only for teachers and admins
 */

// OAuth2 client configuration
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

/**
 * Generate OAuth authorization URL
 * @param {String} userId - User's MongoDB ID
 * @param {String} returnTo - Optional return path after OAuth
 * @returns {Object} { authUrl, state }
 */
const getAuthUrl = (userId, returnTo = '/') => {
  const oauth2Client = getOAuth2Client();

  // Generate state token (CSRF protection)
  const state = crypto.randomBytes(32).toString('hex');
  const stateData = {
    userId,
    returnTo,
    timestamp: Date.now(),
  };
  const stateToken = Buffer.from(JSON.stringify(stateData)).toString('base64');

  // Scopes - minimal: only calendar events
  const scopes = ['https://www.googleapis.com/auth/calendar.events'];

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required for refresh token
    prompt: 'consent', // Force consent screen to get refresh token
    scope: scopes,
    state: stateToken,
  });

  return {
    authUrl,
    state: stateToken,
  };
};

/**
 * Validate and parse state token
 * @param {String} stateToken - State token from OAuth callback
 * @returns {Object} { userId, returnTo } or null if invalid
 */
const validateState = (stateToken) => {
  try {
    const stateData = JSON.parse(Buffer.from(stateToken, 'base64').toString());
    
    // Check if state is expired (10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    if (stateData.timestamp < tenMinutesAgo) {
      return null; // State expired
    }

    return {
      userId: stateData.userId,
      returnTo: stateData.returnTo || '/',
    };
  } catch (error) {
    return null; // Invalid state
  }
};

/**
 * Exchange authorization code for tokens
 * @param {String} code - Authorization code from Google
 * @param {String} state - State token for CSRF protection
 * @returns {Object} Integration data
 * @throws {Error} If exchange fails or state is invalid
 */
const exchangeCodeForTokens = async (code, state) => {
  // Validate state
  const stateData = validateState(state);
  if (!stateData) {
    throw new Error('Invalid or expired state token');
  }

  const { userId } = stateData;

  // Verify user exists and is teacher/admin
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (!['teacher', 'admin'].includes(user.role)) {
    throw new Error('Only teachers and admins can connect Google accounts');
  }

  const oauth2Client = getOAuth2Client();

  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain tokens from Google');
  }

  // Calculate expiry date
  const expiryDate = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

  // Get user info to get email
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  let connectedEmail = null;
  try {
    const userInfo = await oauth2.userinfo.get();
    connectedEmail = userInfo.data.email;
  } catch (error) {
    console.warn('[GoogleOAuth] Could not fetch user email:', error.message);
  }

  // Save or update integration
  const integration = await GoogleIntegration.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      scope: tokens.scope || 'https://www.googleapis.com/auth/calendar.events',
      expiryDate,
      connectedEmail,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    integration,
    returnTo: stateData.returnTo,
  };
};

/**
 * Refresh access token if needed
 * @param {String} userId - User's MongoDB ID
 * @returns {Object} Updated integration
 * @throws {Error} If refresh fails
 */
const refreshAccessTokenIfNeeded = async (userId) => {
  const integration = await GoogleIntegration.findOne({ user: userId, isActive: true });

  if (!integration) {
    throw new Error('Google account not connected');
  }

  // Check if token is expired or expiring soon
  if (!integration.isTokenExpired() && !integration.isTokenExpiringSoon()) {
    return integration; // Token is still valid
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: integration.refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update integration with new tokens
    const expiryDate = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + (credentials.expires_in || 3600) * 1000);

    integration.accessToken = credentials.access_token;
    if (credentials.refresh_token) {
      integration.refreshToken = credentials.refresh_token;
    }
    integration.expiryDate = expiryDate;
    await integration.save();

    return integration;
  } catch (error) {
    console.error('[GoogleOAuth] Token refresh failed:', error);
    // Mark integration as inactive if refresh fails
    integration.isActive = false;
    await integration.save();
    throw new Error('Failed to refresh access token. Please reconnect your Google account.');
  }
};

/**
 * Revoke token and disconnect Google account
 * @param {String} userId - User's MongoDB ID
 * @returns {Boolean} Success
 */
const revokeToken = async (userId) => {
  const integration = await GoogleIntegration.findOne({ user: userId, isActive: true });

  if (!integration) {
    return true; // Already disconnected
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: integration.accessToken,
  });

  try {
    // Revoke token with Google
    await oauth2Client.revokeCredentials();
  } catch (error) {
    console.warn('[GoogleOAuth] Token revocation failed (may already be revoked):', error.message);
  }

  // Delete integration
  await GoogleIntegration.findOneAndDelete({ user: userId });

  return true;
};

/**
 * Get user's Google integration status
 * @param {String} userId - User's MongoDB ID
 * @returns {Object} Integration status
 */
const getUserIntegration = async (userId) => {
  const integration = await GoogleIntegration.findOne({ user: userId, isActive: true });

  if (!integration) {
    return {
      connected: false,
      email: null,
    };
  }

  return {
    connected: true,
    email: integration.connectedEmail,
    expiresAt: integration.expiryDate,
  };
};

/**
 * Get OAuth2 client with user's credentials
 * @param {String} userId - User's MongoDB ID
 * @returns {Object} Configured OAuth2 client
 * @throws {Error} If not connected or token refresh fails
 */
const getAuthenticatedClient = async (userId) => {
  // Refresh token if needed
  const integration = await refreshAccessTokenIfNeeded(userId);

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
  });

  return oauth2Client;
};

module.exports = {
  getAuthUrl,
  validateState,
  exchangeCodeForTokens,
  refreshAccessTokenIfNeeded,
  revokeToken,
  getUserIntegration,
  getAuthenticatedClient,
};
