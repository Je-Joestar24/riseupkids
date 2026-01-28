const youtubeOAuth = require('../services/youtubeOAuth.service');
const youtubeLive = require('../services/youtubeLive.service');

/**
 * YouTube Live Controller
 * 
 * Handles HTTP requests for YouTube Live operations
 * All routes require authentication and teacher/admin role
 */

/**
 * @desc    Get YouTube OAuth authorization URL
 * @route   GET /api/youtube/oauth/url
 * @access  Private (Teacher/Admin only)
 * @query   returnTo - Optional return path after OAuth
 */
const getAuthUrl = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { returnTo = '/admin/live-classes' } = req.query;

    const { authUrl, state } = youtubeOAuth.getAuthUrl(userId, returnTo);

    res.status(200).json({
      success: true,
      authUrl,
      state,
    });
  } catch (error) {
    console.error('[YouTubeLive] Error getting auth URL:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate OAuth URL',
    });
  }
};

/**
 * @desc    Handle YouTube OAuth callback
 * @route   GET /api/youtube/oauth/callback
 * @access  Public (called by Google)
 * @query   code - Authorization code from Google
 * @query   state - State token for CSRF protection
 */
const handleOAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(
        `${process.env.FRONTEND_BASE_URL || 'http://localhost:3000'}/integrations/youtube/error?error=missing_params`
      );
    }

    const { integration, returnTo } = await youtubeOAuth.exchangeCodeForTokens(code, state);

    // Redirect back to the original page (or success page if returnTo is not set)
    const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const redirectPath = returnTo && returnTo !== '/' 
      ? returnTo 
      : '/admin/live-classes'; // Default to live classes page if no returnTo specified
    
    // Add success query params to show success message
    const redirectUrl = `${frontendUrl}${redirectPath}?success=true&email=${encodeURIComponent(integration.connectedEmail || '')}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('[YouTubeLive] OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/integrations/youtube/error?error=${encodeURIComponent(error.message || 'oauth_failed')}`
    );
  }
};

/**
 * @desc    Get YouTube connection status
 * @route   GET /api/youtube/status
 * @access  Private (Teacher/Admin only)
 */
const getConnectionStatus = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const integration = await youtubeOAuth.getUserIntegration(userId);

    res.status(200).json({
      success: true,
      connected: integration.connected,
      connectedEmail: integration.email,
      connectedAt: integration.expiresAt ? new Date(integration.expiresAt) : null,
    });
  } catch (error) {
    console.error('[YouTubeLive] Error getting connection status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get connection status',
    });
  }
};

/**
 * @desc    Disconnect YouTube account
 * @route   POST /api/youtube/disconnect
 * @access  Private (Teacher/Admin only)
 */
const disconnectYouTube = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    await youtubeOAuth.revokeToken(userId);

    res.status(200).json({
      success: true,
      message: 'YouTube account disconnected successfully',
    });
  } catch (error) {
    console.error('[YouTubeLive] Error disconnecting YouTube:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to disconnect YouTube account',
    });
  }
};

/**
 * @desc    Create a YouTube live stream
 * @route   POST /api/youtube/live/create
 * @access  Private (Teacher/Admin only)
 * @body    { title, description?, scheduledStartTime?, privacyStatus?, enableAutoStart?, enableAutoStop? }
 * 
 * If OAuth is enabled and user not connected, returns special error to trigger OAuth flow
 */
const createLiveStream = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const {
      title,
      description,
      scheduledStartTime,
      privacyStatus,
      enableAutoStart,
      enableAutoStop,
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: title',
      });
    }

    // Validate privacy status if provided
    if (privacyStatus && !['public', 'unlisted', 'private'].includes(privacyStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid privacyStatus. Must be one of: public, unlisted, private',
      });
    }

    const stream = await youtubeLive.createLiveStream(userId, {
      title,
      description,
      scheduledStartTime,
      privacyStatus,
      enableAutoStart,
      enableAutoStop,
    });

    res.status(201).json({
      success: true,
      message: stream.isMock 
        ? 'Test stream created (OAuth disabled)' 
        : 'Live stream created successfully',
      data: stream,
    });
  } catch (error) {
    console.error('[YouTubeLive] Error creating live stream:', error);

    // Special error code: OAuth required but not connected
    if (error.message === 'GOOGLE_OAUTH_REQUIRED') {
      return res.status(401).json({
        success: false,
        message: 'YouTube account connection required',
        code: 'OAUTH_REQUIRED',
        requiresOAuth: true,
      });
    }

    // Check if it's a connection error
    if (error.message.includes('not connected') || error.message.includes('refresh')) {
      return res.status(401).json({
        success: false,
        message: 'YouTube account not connected or token expired. Please reconnect your YouTube account.',
        code: 'OAUTH_REQUIRED',
        requiresOAuth: true,
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create live stream',
    });
  }
};

module.exports = {
  getAuthUrl,
  handleOAuthCallback,
  getConnectionStatus,
  disconnectYouTube,
  createLiveStream,
};
