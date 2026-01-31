const youtubeOAuth = require('../services/youtubeOAuth.service');
const youtubeLive = require('../services/youtubeLive.service');
const YouTubeLive = require('../models/YouTubeLive');

/**
 * YouTube Live Controller
 * 
 * Handles HTTP requests for YouTube Live operations
 * All routes require authentication and teacher/admin role
 */

/**
 * @desc    Get YouTube OAuth authorization URL (Admin only - for centralized connection)
 * @route   GET /api/youtube/oauth/url
 * @access  Private (Admin only)
 * @query   returnTo - Optional return path after OAuth
 */
const getAuthUrl = async (req, res) => {
  try {
    // Only admins can set up YouTube connection
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can connect YouTube account',
      });
    }

    const userId = req.user._id.toString();
    const { returnTo = '/admin/youtube-live' } = req.query;

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
 * @desc    Get YouTube connection status (centralized admin account)
 * @route   GET /api/youtube/status
 * @access  Private (Teacher/Admin only)
 */
const getConnectionStatus = async (req, res) => {
  try {
    const integration = await youtubeOAuth.getIntegrationStatus();

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
 * @desc    Disconnect YouTube account (Admin only - centralized account)
 * @route   POST /api/youtube/disconnect
 * @access  Private (Admin only)
 */
const disconnectYouTube = async (req, res) => {
  try {
    // Only admins can disconnect YouTube
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can disconnect YouTube account',
      });
    }

    await youtubeOAuth.revokeToken();

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

    // Persist to LMS so user can view/list/archive/delete later (skip for mock)
    let savedDoc = null;
    if (!stream.isMock && stream.streamId && stream.broadcastId) {
      try {
        savedDoc = await YouTubeLive.create({
          createdBy: req.user._id,
          youtubeStreamId: stream.streamId,
          youtubeBroadcastId: stream.broadcastId,
          streamKey: stream.streamKey,
          rtmpUrl: stream.rtmpUrl,
          watchUrl: stream.watchUrl,
          embedUrl: stream.embedUrl || '',
          title: stream.title,
          description: stream.description || '',
          privacyStatus: stream.privacyStatus || 'public',
          scheduledStartTime: stream.scheduledStartTime ? new Date(stream.scheduledStartTime) : null,
          status: stream.status || 'created',
        });
      } catch (saveErr) {
        console.error('[YouTubeLive] Failed to save live to LMS:', saveErr);
        // Still return success; stream was created on YouTube
      }
    }

    const responseData = savedDoc
      ? { ...stream, id: savedDoc._id.toString(), _id: savedDoc._id.toString() }
      : stream;

    res.status(201).json({
      success: true,
      message: stream.isMock 
        ? 'Test stream created (OAuth disabled)' 
        : 'Live stream created successfully',
      data: responseData,
    });
  } catch (error) {
    console.error('[YouTubeLive] Error creating live stream:', error);

    // Special error code: YouTube not connected (admin needs to connect)
    if (error.message === 'YOUTUBE_NOT_CONNECTED') {
      return res.status(503).json({
        success: false,
        message: 'YouTube account is not connected. Please ask an admin to connect the YouTube account.',
        code: 'YOUTUBE_NOT_CONNECTED',
      });
    }

    // Check if it's a connection error
    if (error.message.includes('not connected') || error.message.includes('refresh')) {
      return res.status(503).json({
        success: false,
        message: 'YouTube account not connected or token expired. Please ask an admin to reconnect the YouTube account.',
        code: 'YOUTUBE_NOT_CONNECTED',
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create live stream',
    });
  }
};

/**
 * @desc    List YouTube lives for current user (paginated, search)
 * @route   GET /api/youtube/live
 * @access  Private (Teacher/Admin only)
 * @query   page, limit, search, isArchived
 */
const getAllLives = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = req.query.search ? String(req.query.search).trim() : '';
    const isArchived = req.query.isArchived;

    const filters = {
      createdBy: userId,
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    if (search) filters.search = search;
    if (isArchived !== undefined && isArchived !== '') filters.isArchived = isArchived;

    const [lives, total] = await Promise.all([
      YouTubeLive.findWithFilters(filters),
      YouTubeLive.countWithFilters(filters),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      message: 'Lives retrieved successfully',
      data: lives,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('[YouTubeLive] Error listing lives:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve lives',
    });
  }
};

/**
 * @desc    Get one YouTube live by LMS id (creator only)
 * @route   GET /api/youtube/live/:id
 * @access  Private (Teacher/Admin only)
 */
const getLiveById = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { id } = req.params;

    const live = await YouTubeLive.findOne({ _id: id, createdBy: userId })
      .populate('createdBy', 'name email role')
      .lean();

    if (!live) {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Live retrieved successfully',
      data: live,
    });
  } catch (error) {
    console.error('[YouTubeLive] Error getting live:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve live',
    });
  }
};

/**
 * @desc    Archive a YouTube live (creator only)
 * @route   PATCH /api/youtube/live/:id/archive
 * @access  Private (Teacher/Admin only)
 */
const archiveLive = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { id } = req.params;

    const live = await YouTubeLive.findOneAndUpdate(
      { _id: id, createdBy: userId },
      { isArchived: true },
      { new: true, runValidators: true }
    ).lean();

    if (!live) {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Live stream archived successfully',
      data: live,
    });
  } catch (error) {
    console.error('[YouTubeLive] Error archiving live:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to archive live',
    });
  }
};

/**
 * @desc    Delete a YouTube live from LMS (creator only)
 * @route   DELETE /api/youtube/live/:id
 * @access  Private (Teacher/Admin only)
 */
const deleteLive = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { id } = req.params;

    const live = await YouTubeLive.findOneAndDelete({ _id: id, createdBy: userId });

    if (!live) {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Live stream deleted successfully',
    });
  } catch (error) {
    console.error('[YouTubeLive] Error deleting live:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete live',
    });
  }
};

module.exports = {
  getAuthUrl,
  handleOAuthCallback,
  getConnectionStatus,
  disconnectYouTube,
  createLiveStream,
  getAllLives,
  getLiveById,
  archiveLive,
  deleteLive,
};
