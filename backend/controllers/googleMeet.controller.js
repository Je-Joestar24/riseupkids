const googleOAuth = require('../services/googleOAuth.service');
const googleMeet = require('../services/googleMeet.service');

/**
 * Google Meet Controller
 * 
 * Handles HTTP requests for Google OAuth and meeting management
 * All routes require authentication and teacher/admin role (except callback)
 */

/**
 * @desc    Get Google OAuth authorization URL
 * @route   GET /api/google/oauth/url
 * @access  Private (Teacher/Admin only)
 * @query   returnTo - Optional return path after OAuth
 */
const getAuthUrl = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const returnTo = req.query.returnTo || '/';

    const { authUrl, state } = googleOAuth.getAuthUrl(userId, returnTo);

    res.status(200).json({
      success: true,
      message: 'OAuth URL generated successfully',
      data: {
        authUrl,
        state,
      },
    });
  } catch (error) {
    console.error('[GoogleMeet] Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate OAuth URL',
    });
  }
};

/**
 * @desc    Handle Google OAuth callback
 * @route   GET /api/google/oauth/callback
 * @access  Public (called by Google)
 * @query   code - Authorization code from Google
 * @query   state - State token for CSRF protection
 */
const handleOAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(
        `${process.env.FRONTEND_BASE_URL || 'http://localhost:3000'}/integrations/google/error?error=missing_params`
      );
    }

    const { integration, returnTo } = await googleOAuth.exchangeCodeForTokens(code, state);

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const successPath = returnTo.startsWith('/') ? returnTo : `/${returnTo}`;
    res.redirect(`${frontendUrl}/integrations/google/success?email=${encodeURIComponent(integration.connectedEmail || '')}`);
  } catch (error) {
    console.error('[GoogleMeet] OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/integrations/google/error?error=${encodeURIComponent(error.message || 'oauth_failed')}`
    );
  }
};

/**
 * @desc    Get Google connection status
 * @route   GET /api/google/status
 * @access  Private (Teacher/Admin only)
 */
const getConnectionStatus = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const status = await googleOAuth.getUserIntegration(userId);

    res.status(200).json({
      success: true,
      message: 'Connection status retrieved successfully',
      data: status,
    });
  } catch (error) {
    console.error('[GoogleMeet] Error getting connection status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get connection status',
    });
  }
};

/**
 * @desc    Disconnect Google account
 * @route   POST /api/google/disconnect
 * @access  Private (Teacher/Admin only)
 */
const disconnectGoogle = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    await googleOAuth.revokeToken(userId);

    res.status(200).json({
      success: true,
      message: 'Google account disconnected successfully',
    });
  } catch (error) {
    console.error('[GoogleMeet] Error disconnecting Google:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to disconnect Google account',
    });
  }
};

/**
 * @desc    Create a Google Meet meeting
 * @route   POST /api/google/meetings
 * @access  Private (Teacher/Admin only)
 * @body    { summary, description?, startTime, endTime, timeZone, attendees?[] }
 */
const createMeeting = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { summary, description, startTime, endTime, timeZone, attendees } = req.body;

    // Validate required fields
    if (!summary || !startTime || !endTime || !timeZone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: summary, startTime, endTime, timeZone',
      });
    }

    const meeting = await googleMeet.createMeeting(userId, {
      summary,
      description,
      startTime,
      endTime,
      timeZone,
      attendees: attendees || [],
    });

    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: meeting,
    });
  } catch (error) {
    console.error('[GoogleMeet] Error creating meeting:', error);

    // Check if it's a connection error
    if (error.message.includes('not connected') || error.message.includes('refresh')) {
      return res.status(401).json({
        success: false,
        message: 'Google account not connected or token expired. Please reconnect your Google account.',
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create meeting',
    });
  }
};

/**
 * @desc    Update a meeting
 * @route   PATCH /api/google/meetings/:eventId
 * @access  Private (Teacher/Admin only)
 * @body    { summary?, description?, startTime?, endTime?, timeZone?, attendees?[] }
 */
const updateMeeting = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { eventId } = req.params;
    const updates = req.body;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided',
      });
    }

    const meeting = await googleMeet.updateMeeting(userId, eventId, updates);

    res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      data: meeting,
    });
  } catch (error) {
    console.error('[GoogleMeet] Error updating meeting:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('not connected') || error.message.includes('refresh')) {
      return res.status(401).json({
        success: false,
        message: 'Google account not connected or token expired. Please reconnect your Google account.',
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update meeting',
    });
  }
};

/**
 * @desc    Cancel/delete a meeting
 * @route   DELETE /api/google/meetings/:eventId
 * @access  Private (Teacher/Admin only)
 */
const cancelMeeting = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { eventId } = req.params;

    await googleMeet.cancelMeeting(userId, eventId);

    res.status(200).json({
      success: true,
      message: 'Meeting cancelled successfully',
    });
  } catch (error) {
    console.error('[GoogleMeet] Error cancelling meeting:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('not connected') || error.message.includes('refresh')) {
      return res.status(401).json({
        success: false,
        message: 'Google account not connected or token expired. Please reconnect your Google account.',
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel meeting',
    });
  }
};

/**
 * @desc    Get meeting details
 * @route   GET /api/google/meetings/:eventId
 * @access  Private (Teacher/Admin only)
 * 
 * Note: Parents/Children join meetings via link (no Google connection needed)
 * If Meeting model is added later, create separate endpoint for parents
 */
const getMeeting = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { eventId } = req.params;

    const meeting = await googleMeet.getMeeting(userId, eventId);

    res.status(200).json({
      success: true,
      message: 'Meeting retrieved successfully',
      data: meeting,
    });
  } catch (error) {
    console.error('[GoogleMeet] Error fetching meeting:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('not connected') || error.message.includes('refresh')) {
      return res.status(401).json({
        success: false,
        message: 'Google account not connected or token expired. Please reconnect your Google account.',
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch meeting',
    });
  }
};

module.exports = {
  getAuthUrl,
  handleOAuthCallback,
  getConnectionStatus,
  disconnectGoogle,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  getMeeting,
};
