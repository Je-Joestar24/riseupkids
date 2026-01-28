const { google } = require('googleapis');
const youtubeOAuth = require('./youtubeOAuth.service');

/**
 * YouTube Live Service
 * 
 * Handles YouTube Live API operations for creating/managing live streams
 * Requires authenticated YouTube account (OAuth) unless USE_YOUTUBE_OAUTH=false
 */

/**
 * Check if OAuth is enabled
 * @returns {Boolean}
 */
const isOAuthEnabled = () => {
  return process.env.USE_YOUTUBE_OAUTH !== 'false';
};

/**
 * Create a mock/test live stream (when OAuth is disabled)
 * @param {Object} streamData - Stream details
 * @returns {Object} Mock stream details
 */
const createMockStream = (streamData) => {
  const { title, description, privacyStatus = 'unlisted' } = streamData;
  
  // Generate mock IDs
  const mockStreamId = `mock-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const mockBroadcastId = `mock-broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const mockStreamKey = `mock-stream-key-${Math.random().toString(36).substr(2, 12)}`;
  
  return {
    streamId: mockStreamId,
    broadcastId: mockBroadcastId,
    streamKey: mockStreamKey,
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    watchUrl: `https://www.youtube.com/watch?v=${mockBroadcastId}`,
    embedUrl: `https://www.youtube.com/embed/${mockBroadcastId}`,
    title: title,
    description: description || '',
    privacyStatus: privacyStatus,
    scheduledStartTime: streamData.scheduledStartTime || new Date().toISOString(),
    status: 'created',
    isMock: true, // Flag to indicate this is a test/mock stream
  };
};

/**
 * Create a YouTube live stream
 * @param {String} userId - User's MongoDB ID
 * @param {Object} streamData - Stream details
 * @param {String} streamData.title - Stream title (required)
 * @param {String} streamData.description - Stream description (optional)
 * @param {Date|String} streamData.scheduledStartTime - Scheduled start time (optional, ISO string)
 * @param {String} streamData.privacyStatus - Privacy status: 'public', 'unlisted', 'private' (default: 'unlisted')
 * @param {Boolean} streamData.enableAutoStart - Auto-start when OBS connects (default: false)
 * @param {Boolean} streamData.enableAutoStop - Auto-stop when OBS disconnects (default: false)
 * @returns {Object} Stream details with stream key and RTMP URL
 * @throws {Error} If creation fails or OAuth required but not connected
 */
const createLiveStream = async (userId, streamData) => {
  const {
    title,
    description,
    scheduledStartTime,
    privacyStatus = 'unlisted',
    enableAutoStart = false,
    enableAutoStop = false,
  } = streamData;

  // Validate required fields
  if (!title) {
    throw new Error('Missing required field: title');
  }

  // If OAuth is disabled, return mock stream
  if (!isOAuthEnabled()) {
    console.log('[YouTubeLive] OAuth disabled - creating mock stream for testing');
    return createMockStream(streamData);
  }

  // Check if user has YouTube integration
  const integration = await youtubeOAuth.getUserIntegration(userId);
  if (!integration.connected) {
    throw new Error('GOOGLE_OAUTH_REQUIRED'); // Special error code for frontend to trigger OAuth
  }

  // Get authenticated client
  const auth = await youtubeOAuth.getAuthenticatedClient(userId);
  const youtube = google.youtube({ version: 'v3', auth });

  // Validate channel ID if provided
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (channelId) {
    try {
      // Verify channel access
      const channelResponse = await youtube.channels.list({
        part: 'id',
        mine: true,
      });

      const userChannels = channelResponse.data.items || [];
      const hasAccess = userChannels.some(channel => channel.id === channelId);

      if (!hasAccess) {
        throw new Error(`User does not have access to channel ${channelId}`);
      }
    } catch (error) {
      console.error('[YouTubeLive] Channel validation error:', error);
      // Continue anyway - channel validation is not critical
    }
  }

  try {
    // Step 1: Create the live stream
    const streamResponse = await youtube.liveStreams.insert({
      part: ['snippet', 'cdn', 'contentDetails'],
      requestBody: {
        snippet: {
          title: title,
          description: description || '',
        },
        cdn: {
          format: '1080p', // Can be '1080p', '720p', '480p', '360p', '240p'
          ingestionType: 'rtmp',
        },
        contentDetails: {
          isReusable: false, // Each stream is unique
        },
      },
    });

    const stream = streamResponse.data;
    const streamId = stream.id;
    const ingestionInfo = stream.cdn?.ingestionInfo;

    if (!ingestionInfo || !ingestionInfo.streamName || !ingestionInfo.ingestionAddress) {
      throw new Error('Failed to get stream ingestion information');
    }

    const streamKey = ingestionInfo.streamName;
    const rtmpUrl = ingestionInfo.ingestionAddress;

    // Step 2: Create the broadcast
    const scheduledTime = scheduledStartTime
      ? new Date(scheduledStartTime).toISOString()
      : new Date().toISOString();

    const broadcastResponse = await youtube.liveBroadcasts.insert({
      part: ['snippet', 'status', 'contentDetails'],
      requestBody: {
        snippet: {
          title: title,
          description: description || '',
          scheduledStartTime: scheduledTime,
        },
        status: {
          privacyStatus: privacyStatus, // 'public', 'unlisted', 'private'
          selfDeclaredMadeForKids: false,
        },
        contentDetails: {
          enableAutoStart: enableAutoStart,
          enableAutoStop: enableAutoStop,
          enableClosedCaptions: false,
          enableContentEncryption: false,
          enableDvr: true, // Allow DVR (rewind)
          enableEmbed: true, // Allow embedding
          recordFromStart: false, // Don't auto-record
          startWithSlate: false,
        },
      },
    });

    const broadcast = broadcastResponse.data;
    const broadcastId = broadcast.id;

    // Step 3: Bind the stream to the broadcast
    await youtube.liveBroadcasts.bind({
      part: ['id', 'contentDetails'],
      id: broadcastId,
      streamId: streamId,
    });

    // Construct URLs
    const watchUrl = `https://www.youtube.com/watch?v=${broadcastId}`;
    const embedUrl = `https://www.youtube.com/embed/${broadcastId}`;

    return {
      streamId: streamId,
      broadcastId: broadcastId,
      streamKey: streamKey,
      rtmpUrl: rtmpUrl,
      watchUrl: watchUrl,
      embedUrl: embedUrl,
      title: title,
      description: description || '',
      privacyStatus: privacyStatus,
      scheduledStartTime: scheduledTime,
      status: 'created',
      isMock: false,
    };
  } catch (error) {
    console.error('[YouTubeLive] Error creating live stream:', error);
    
    // Handle specific YouTube API errors
    if (error.response && error.response.data) {
      const errorData = error.response.data.error;
      if (errorData) {
        const errorMessage = errorData.message || 'YouTube API error';
        throw new Error(`YouTube API Error: ${errorMessage}`);
      }
    }

    // Re-throw OAuth errors
    if (error.message === 'GOOGLE_OAUTH_REQUIRED' || error.message.includes('not connected')) {
      throw new Error('GOOGLE_OAUTH_REQUIRED');
    }

    throw new Error(error.message || 'Failed to create live stream');
  }
};

module.exports = {
  createLiveStream,
  isOAuthEnabled,
};
