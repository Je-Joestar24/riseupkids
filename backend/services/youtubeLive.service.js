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
 * @param {String} userId - User's MongoDB ID (for tracking who created the stream)
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

  // Check if admin YouTube integration exists (centralized)
  const integration = await youtubeOAuth.getIntegrationStatus();
  if (!integration.connected) {
    throw new Error('YOUTUBE_NOT_CONNECTED'); // Admin needs to connect YouTube account
  }

  // Get authenticated client (uses centralized admin account)
  const auth = await youtubeOAuth.getAuthenticatedClient();
  const youtube = google.youtube({ version: 'v3', auth });

  // Get all channels the authenticated account has access to
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  let targetChannel = null;
  let defaultChannel = null;
  let allChannels = [];

  try {
    console.log('\n========== YOUTUBE CHANNEL VERIFICATION ==========');
    
    // Get channels the authenticated account OWNS (mine: true)
    const ownedChannelsResponse = await youtube.channels.list({
      part: 'id,snippet,contentDetails,status,statistics',
      mine: true,
      maxResults: 50,
    });

    const ownedChannels = ownedChannelsResponse.data.items || [];
    allChannels = [...ownedChannels];
    
    console.log(`[YouTubeLive] Authenticated account OWNS ${ownedChannels.length} channel(s):`);
    ownedChannels.forEach((channel, index) => {
      const isTarget = channel.id === channelId;
      console.log(`\n  Owned Channel ${index + 1}:`);
      console.log(`    - ID: ${channel.id}`);
      console.log(`    - Name: ${channel.snippet?.title || 'Unknown'}`);
      console.log(`    - Custom URL: ${channel.snippet?.customUrl || 'N/A'}`);
      console.log(`    - Is Target Channel (${channelId}): ${isTarget ? '✅ YES' : '❌ NO'}`);
      
      if (isTarget) {
        targetChannel = channel;
      }
    });

    // Find default channel (first owned channel)
    if (ownedChannels.length > 0) {
      defaultChannel = ownedChannels[0];
      console.log(`\n[YouTubeLive] Default channel (owned):`);
      console.log(`  - ID: ${defaultChannel.id}`);
      console.log(`  - Name: ${defaultChannel.snippet?.title || 'Unknown'}`);
    }

    // IMPORTANT: Check if target channel exists and account has access to it
    // Even if not owned, manager accounts can access it
    if (channelId) {
      try {
        // Try to get the target channel directly (this works for manager accounts)
        const targetChannelResponse = await youtube.channels.list({
          part: 'id,snippet,contentDetails,status,statistics',
          id: channelId,
        });

        if (targetChannelResponse.data.items && targetChannelResponse.data.items.length > 0) {
          targetChannel = targetChannelResponse.data.items[0];
          console.log(`\n✅ TARGET CHANNEL ACCESS VERIFIED:`);
          console.log(`   Channel ID: ${targetChannel.id}`);
          console.log(`   Channel Name: ${targetChannel.snippet?.title || 'Unknown'}`);
          console.log(`   Custom URL: ${targetChannel.snippet?.customUrl || 'N/A'}`);
          console.log(`   Subscribers: ${targetChannel.statistics?.subscriberCount || 'N/A'}`);
          console.log(`   Account has access to this channel (as owner or manager)`);
          
          // Add to allChannels if not already there
          if (!allChannels.find(c => c.id === channelId)) {
            allChannels.push(targetChannel);
          }
        } else {
          throw new Error(`Channel ${channelId} not found or account does not have access`);
        }
      } catch (accessError) {
        console.error(`\n❌ ERROR: Cannot access target channel ${channelId}`);
        console.error(`   Error: ${accessError.message}`);
        console.error(`   This means the account does not have manager/owner access to this channel.`);
        throw new Error(
          `The connected account does not have access to channel ${channelId}. ` +
          `Please verify: 1) The account is a manager or owner of this channel, ` +
          `2) The channel ID is correct, 3) The account has the necessary permissions.`
        );
      }

      // Check channel features/status
      if (targetChannel.status) {
        console.log(`\n   Channel Status:`);
        console.log(`   - Privacy Status: ${targetChannel.status.privacyStatus || 'N/A'}`);
        console.log(`   - Made for Kids: ${targetChannel.status.madeForKids ? 'Yes' : 'No'}`);
        console.log(`   - Self Declared Made for Kids: ${targetChannel.status.selfDeclaredMadeForKids ? 'Yes' : 'No'}`);
      }

      // IMPORTANT: For manager accounts, YouTube API uses the DEFAULT channel
      // The admin/owner should connect using their own account, and the system will use their default channel
      if (defaultChannel && defaultChannel.id !== channelId) {
        console.warn(`\n⚠️  INFO: Default channel (${defaultChannel.id}) is different from YOUTUBE_CHANNEL_ID (${channelId})`);
        console.warn(`   YouTube API will use the DEFAULT channel (${defaultChannel.snippet?.title || defaultChannel.id}) for broadcasts.`);
        console.warn(`   Current default: ${defaultChannel.snippet?.title || defaultChannel.id} (${defaultChannel.id})`);
        console.warn(`   YOUTUBE_CHANNEL_ID in .env: ${targetChannel.snippet?.title || channelId} (${channelId})`);
        console.warn(`   Note: The system will use the connected account's default channel.`);
      } else if (defaultChannel && defaultChannel.id === channelId) {
        console.log(`\n✅ Default channel matches YOUTUBE_CHANNEL_ID - broadcasts will use correct channel!`);
      } else if (!defaultChannel) {
        console.log(`\n✅ Target channel verified - will be used for broadcasts!`);
      }
    } else {
      console.warn(`\n⚠️  WARNING: YOUTUBE_CHANNEL_ID not set in .env`);
      console.warn(`   Will use default channel: ${defaultChannel?.id} (${defaultChannel?.snippet?.title || 'Unknown'})`);
    }

    console.log('==================================================\n');
  } catch (error) {
    console.error('\n========== YOUTUBE CHANNEL VERIFICATION ERROR ==========');
    console.error('[YouTubeLive] Error verifying channels:', error.message);
    console.error('==========================================================\n');
    
    // Re-throw channel access errors
    if (error.message.includes('does not have access')) {
      throw error;
    }
    // For other errors, log but continue (channel might still work)
    console.warn('[YouTubeLive] Continuing despite channel verification error...');
  }

  try {
    // Log which channel will be used
    const channelToUse = targetChannel || defaultChannel;
    if (channelToUse) {
      console.log(`[YouTubeLive] Creating stream for channel: ${channelToUse.id} (${channelToUse.snippet?.title || 'Unknown'})`);
    }

    // Step 1: Create the live stream
    const streamResponse = await youtube.liveStreams.insert({
      part: ['snippet', 'cdn', 'contentDetails'],
      requestBody: {
        snippet: {
          title: title,
          description: description || '',
        },
        cdn: {
          resolution: '1080p', // Required. Values: 240p, 360p, 480p, 720p, 1080p, 1440p, 2160p, or 'variable'
          frameRate: '30fps', // Required. Values: 30fps, 60fps, or 'variable'
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

    // Create broadcast - YouTube will use the default channel of the authenticated account
    // If channelId is specified and account has access, it will use that channel
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
          recordFromStart: true, // Required for most channels; only some partners can disable
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

    // Verify which channel the broadcast was actually created on
    let actualBroadcastChannel = null;
    try {
      const broadcastDetails = await youtube.liveBroadcasts.list({
        part: 'snippet',
        id: broadcastId,
      });
      
      if (broadcastDetails.data.items && broadcastDetails.data.items.length > 0) {
        const broadcast = broadcastDetails.data.items[0];
        actualBroadcastChannel = broadcast.snippet?.channelId;
        console.log(`\n[YouTubeLive] Broadcast verification:`);
        console.log(`   Broadcast created on channel: ${actualBroadcastChannel}`);
        
        if (channelId && actualBroadcastChannel !== channelId) {
          console.error(`\n❌ ERROR: Broadcast was created on wrong channel!`);
          console.error(`   Expected channel: ${channelId} (${targetChannel?.snippet?.title || 'Unknown'})`);
          console.error(`   Actual channel: ${actualBroadcastChannel}`);
          console.error(`   This means the default channel is not the target channel.`);
          console.error(`   Solution: Make the target channel the default, or use an account that only manages that channel.`);
        } else if (channelId && actualBroadcastChannel === channelId) {
          console.log(`   ✅ Broadcast created on correct target channel!`);
        }
      }
    } catch (verifyError) {
      console.warn(`[YouTubeLive] Could not verify broadcast channel: ${verifyError.message}`);
    }

    // Construct URLs
    const watchUrl = `https://www.youtube.com/watch?v=${broadcastId}`;
    const embedUrl = `https://www.youtube.com/embed/${broadcastId}`;

    // Log successful stream creation with channel info
    console.log('\n========== STREAM CREATED SUCCESSFULLY ==========');
    console.log(`[YouTubeLive] Stream created:`);
    console.log(`   Target Channel: ${channelId || 'Not specified'} (${targetChannel?.snippet?.title || 'N/A'})`);
    console.log(`   Actual Broadcast Channel: ${actualBroadcastChannel || 'Could not verify'}`);
    console.log(`   Stream ID: ${streamId}`);
    console.log(`   Broadcast ID: ${broadcastId}`);
    console.log(`   Watch URL: ${watchUrl}`);
    console.log(`   Embed URL: ${embedUrl}`);
    console.log(`   RTMP URL: ${rtmpUrl}`);
    if (actualBroadcastChannel && channelId && actualBroadcastChannel !== channelId) {
      console.log(`\n   ⚠️  WARNING: Broadcast created on different channel than expected!`);
    }
    console.log('==================================================\n');

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
        const errorCode = errorData.code || errorData.errors?.[0]?.reason;
        
        // Provide helpful error messages for common issues
        if (errorMessage.includes('not enabled for live streaming')) {
          throw new Error(
            'Live streaming is not enabled for this account or channel. ' +
            'Please ensure: 1) The connected account has live streaming enabled, ' +
            '2) The account has access to channel ' + (channelId || 'specified in YOUTUBE_CHANNEL_ID') + ', ' +
            '3) Live streaming is enabled on the YouTube channel.'
          );
        }
        
        if (errorMessage.includes('channel') || errorCode === 'channelNotFound') {
          throw new Error(
            `Channel access error: ${errorMessage}. ` +
            `Please verify the connected account has manager/owner access to channel ${channelId || 'specified in YOUTUBE_CHANNEL_ID'}.`
          );
        }
        
        throw new Error(`YouTube API Error: ${errorMessage}`);
      }
    }

    // Re-throw OAuth errors
    if (error.message === 'GOOGLE_OAUTH_REQUIRED' || error.message.includes('not connected')) {
      throw new Error('GOOGLE_OAUTH_REQUIRED');
    }

    // Re-throw channel access errors
    if (error.message.includes('does not have access')) {
      throw error;
    }

    throw new Error(error.message || 'Failed to create live stream');
  }
};

module.exports = {
  createLiveStream,
  isOAuthEnabled,
};
