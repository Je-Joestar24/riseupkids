import { useCallback, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import youtubeService from '../services/youtubeService';
import {
  fetchLives,
  fetchLiveById,
  archiveLive as archiveLiveAction,
  deleteLive as deleteLiveAction,
  setFilters,
  clearFilters,
  clearCurrentLive,
  clearError,
} from '../store/slices/youtubeSlice';

/**
 * Custom hook for YouTube Live operations
 *
 * Provides:
 * - Connection status and OAuth (create stream, connect/disconnect)
 * - List/detail/archive/delete via Redux (lives, pagination, currentLive)
 */
export const useYouTubeLive = () => {
  const dispatch = useDispatch();
  const youtubeState = useSelector((state) => state.youtube);

  // Connection status state (not in Redux; local to hook)
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
   * @param {String} streamData.privacyStatus - Always 'public' (fixed)
   * @param {Boolean} streamData.enableAutoStart - Always true (fixed)
   * @param {Boolean} streamData.enableAutoStop - Always true (fixed)
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
   * Reset all stream state (create-only)
   */
  const resetStreamState = useCallback(() => {
    setStreamLoading(false);
    setStreamError(null);
    setCreatedStream(null);
  }, []);

  // --- List / detail / archive / delete (Redux) ---

  /**
   * Fetch lives list with optional params (page, limit, search, isArchived)
   * @param {Object} params - Override filters for this request
   */
  const getLives = useCallback(
    async (params = {}) => {
      const merged = { ...youtubeState.filters, ...params };
      return dispatch(fetchLives(merged));
    },
    [dispatch, youtubeState.filters]
  );

  /**
   * Fetch one live by LMS id (sets currentLive in Redux)
   * @param {String} id - LMS document _id
   */
  const getLiveById = useCallback(
    async (id) => {
      return dispatch(fetchLiveById(id));
    },
    [dispatch]
  );

  /**
   * Archive a live (creator only)
   * @param {String} id - LMS document _id
   */
  const archiveLive = useCallback(
    async (id) => {
      return dispatch(archiveLiveAction(id));
    },
    [dispatch]
  );

  /**
   * Delete a live from LMS (creator only)
   * @param {String} id - LMS document _id
   */
  const deleteLive = useCallback(
    async (id) => {
      return dispatch(deleteLiveAction(id));
    },
    [dispatch]
  );

  const setLiveFilters = useCallback(
    (filters) => {
      dispatch(setFilters(filters));
    },
    [dispatch]
  );

  const clearLiveFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  const clearLiveDetail = useCallback(() => {
    dispatch(clearCurrentLive());
  }, [dispatch]);

  const clearLiveError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

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

    // Utility (create flow)
    clearStreamError,
    clearCreatedStream,
    resetStreamState,

    // --- List / detail / archive / delete (Redux) ---
    lives: youtubeState.lives,
    currentLive: youtubeState.currentLive,
    pagination: youtubeState.pagination,
    filters: youtubeState.filters,
    listLoading: youtubeState.listLoading,
    detailLoading: youtubeState.detailLoading,
    actionLoading: youtubeState.actionLoading,
    liveError: youtubeState.error,

    getLives,
    getLiveById,
    archiveLive,
    deleteLive,
    setLiveFilters,
    clearLiveFilters,
    clearLiveDetail,
    clearLiveError,
  };
};

export default useYouTubeLive;
