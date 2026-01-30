import { useCallback, useState, useEffect } from 'react';
import youtubeService from '../services/youtubeService';

/**
 * Custom hook for YouTube Live operations
 * 
 * Provides state and actions for YouTube Live stream creation
 * Includes OAuth integration for YouTube account connection
 */
export const useYouTubeLive = () => {
  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    connectedEmail: null,
    connectedAt: null,
    loading: true,
  });

  // Stream creation state
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [createdStream, setCreatedStream] = useState(null);

  /**
   * Fetch YouTube connection status (centralized admin account)
   */
  const checkConnection = useCallback(async () => {
    try {
      setConnectionStatus((prev) => ({ ...prev, loading: true }));
      const response = await youtubeService.getConnectionStatus();
      if (response.success) {
        setConnectionStatus({
          connected: response.connected || false,
          connectedEmail: response.connectedEmail || null,
          connectedAt: response.connectedAt || null,
          loading: false,
        });
      } else {
        setConnectionStatus((prev) => ({ ...prev, loading: false }));
      }
    } catch (err) {
      console.error('Failed to fetch YouTube connection status:', err);
      setConnectionStatus({
        connected: false,
        connectedEmail: null,
        connectedAt: null,
        loading: false,
      });
    }
  }, []);

  /**
   * Initiate OAuth flow
   * Redirects to YouTube OAuth page
   * @param {String} returnTo - Optional return path after OAuth
   */
  const getAuthUrl = useCallback(async (returnTo = '/admin/live-classes') => {
    try {
      const response = await youtubeService.getAuthUrl(returnTo);
      if (response.success && response.authUrl) {
        // Redirect to YouTube OAuth page
        window.location.href = response.authUrl;
        return { success: true };
      }
      throw new Error('Failed to get OAuth URL');
    } catch (err) {
      console.error('Failed to initiate OAuth:', err);
      throw err;
    }
  }, []);

  /**
   * Disconnect YouTube account
   */
  const disconnectYouTube = useCallback(async () => {
    try {
      const response = await youtubeService.disconnectYouTube();
      if (response.success) {
        await checkConnection(); // Refresh status
        return true;
      }
      throw new Error('Failed to disconnect YouTube account');
    } catch (err) {
      console.error('Failed to disconnect YouTube account:', err);
      throw err;
    }
  }, [checkConnection]);

  /**
   * Create a YouTube live stream
   * Automatically handles OAuth if needed
   * @param {Object} streamData - Stream details
   * @param {String} streamData.title - Stream title (required)
   * @param {String} streamData.description - Stream description (optional)
   * @param {Date|String} streamData.scheduledStartTime - Scheduled start time (optional, ISO string)
   * @param {String} streamData.privacyStatus - Privacy status: 'public', 'unlisted', 'private'
   * @param {Boolean} streamData.enableAutoStart - Auto-start when OBS connects (optional)
   * @param {Boolean} streamData.enableAutoStop - Auto-stop when OBS disconnects (optional)
   * @returns {Promise} Stream data or { requiresOAuth: true } if OAuth needed
   */
  const createLiveStream = useCallback(async (streamData) => {
    try {
      setStreamLoading(true);
      setStreamError(null);
      setCreatedStream(null);

      const response = await youtubeService.createLiveStream(streamData);

      // Check if OAuth is required
      if (response.code === 'OAUTH_REQUIRED' || response.requiresOAuth) {
        // Initiate OAuth flow
        await getAuthUrl();
        return { requiresOAuth: true };
      }

      if (response.success && response.data) {
        setCreatedStream(response.data);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create live stream');
    } catch (err) {
      // Check if error indicates YouTube is not connected (admin needs to connect)
      if (
        err.code === 'YOUTUBE_NOT_CONNECTED' ||
        err.message?.includes('YOUTUBE_NOT_CONNECTED') ||
        err.message?.includes('not connected')
      ) {
        // Don't redirect - show error message that admin needs to connect
        throw new Error('YouTube account is not connected. Please ask an admin to connect the YouTube account.');
      }

      const errorMessage =
        err.message || err.response?.data?.message || 'Failed to create live stream';
      setStreamError(errorMessage);
      throw err;
    } finally {
      setStreamLoading(false);
    }
  }, [getAuthUrl]);

  /**
   * Clear stream error
   */
  const clearStreamError = useCallback(() => {
    setStreamError(null);
  }, []);

  /**
   * Clear created stream data
   */
  const clearCreatedStream = useCallback(() => {
    setCreatedStream(null);
  }, []);

  /**
   * Reset all stream state
   */
  const resetStreamState = useCallback(() => {
    setStreamLoading(false);
    setStreamError(null);
    setCreatedStream(null);
  }, []);

  // Fetch connection status on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    // Connection status
    connectionStatus: {
      connected: connectionStatus.connected,
      connectedEmail: connectionStatus.connectedEmail,
      connectedAt: connectionStatus.connectedAt,
      loading: connectionStatus.loading,
    },

    // Stream creation
    createLiveStream,
    streamLoading,
    streamError,
    createdStream,

    // OAuth actions
    getAuthUrl,
    disconnectYouTube,
    checkConnection,

    // Utility actions
    clearStreamError,
    clearCreatedStream,
    resetStreamState,
  };
};

export default useYouTubeLive;
