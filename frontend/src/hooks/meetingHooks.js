import { useCallback, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllMeetings,
  fetchMeetingById,
  updateMeeting as updateMeetingAction,
  archiveMeeting as archiveMeetingAction,
  restoreMeeting as restoreMeetingAction,
  cancelMeeting as cancelMeetingAction,
  deleteMeeting as deleteMeetingAction,
  setFilters,
  clearFilters,
  setCurrentMeeting,
  clearCurrentMeeting,
  clearError,
  resetMeetingState,
} from '../store/slices/meetingSlice';
import meetingService from '../services/meetingService';

/**
 * Custom hook for meeting management
 * 
 * Provides Redux state and actions for meeting CRUD operations
 * Uses centralized state management for interconnected functionality
 * Also includes Google OAuth integration for meeting creation
 */
export const useMeetings = () => {
  const dispatch = useDispatch();
  const meetingState = useSelector((state) => state.meeting);
  
  // Google OAuth connection status
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    connectedEmail: null,
    oAuthEnabled: true,
    loading: true,
  });

  /**
   * Fetch all meetings with optional filters
   * @param {Object} filters - Optional filters to override current filters
   */
  const fetchMeetings = useCallback(
    async (filters = {}) => {
      const params = { ...meetingState.filters, ...filters };
      return dispatch(fetchAllMeetings(params));
    },
    [dispatch, meetingState.filters]
  );

  /**
   * Fetch a single meeting by ID
   * @param {String} meetingId - Meeting ID
   */
  const getMeetingById = useCallback(
    async (meetingId) => {
      return dispatch(fetchMeetingById(meetingId));
    },
    [dispatch]
  );

  /**
   * Update a meeting
   * @param {String} meetingId - Meeting ID
   * @param {Object} updates - Fields to update
   */
  const updateMeeting = useCallback(
    async (meetingId, updates) => {
      return dispatch(updateMeetingAction({ meetingId, updates }));
    },
    [dispatch]
  );

  /**
   * Archive a meeting
   * @param {String} meetingId - Meeting ID
   */
  const archiveMeeting = useCallback(
    async (meetingId) => {
      return dispatch(archiveMeetingAction(meetingId));
    },
    [dispatch]
  );

  /**
   * Restore an archived meeting
   * @param {String} meetingId - Meeting ID
   */
  const restoreMeeting = useCallback(
    async (meetingId) => {
      return dispatch(restoreMeetingAction(meetingId));
    },
    [dispatch]
  );

  /**
   * Cancel a meeting
   * @param {String} meetingId - Meeting ID
   */
  const cancelMeeting = useCallback(
    async (meetingId) => {
      return dispatch(cancelMeetingAction(meetingId));
    },
    [dispatch]
  );

  /**
   * Delete a meeting permanently
   * @param {String} meetingId - Meeting ID
   */
  const deleteMeeting = useCallback(
    async (meetingId) => {
      return dispatch(deleteMeetingAction(meetingId));
    },
    [dispatch]
  );

  /**
   * Update filters
   * @param {Object} newFilters - Filters to merge with current filters
   */
  const updateFilters = useCallback(
    (newFilters) => {
      dispatch(setFilters(newFilters));
    },
    [dispatch]
  );

  /**
   * Clear all filters
   */
  const clearAllFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  /**
   * Set current meeting (from list or external source)
   * @param {Object} meeting - Meeting object to set as current
   */
  const setCurrent = useCallback(
    (meeting) => {
      dispatch(setCurrentMeeting(meeting));
    },
    [dispatch]
  );

  /**
   * Clear current meeting
   */
  const clearCurrent = useCallback(() => {
    dispatch(clearCurrentMeeting());
  }, [dispatch]);

  /**
   * Clear error state
   */
  const clearErrorState = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  /**
   * Reset meeting state to initial
   */
  const resetState = useCallback(() => {
    dispatch(resetMeetingState());
  }, [dispatch]);

  /**
   * Fetch Google connection status
   */
  const fetchConnectionStatus = useCallback(async () => {
    try {
      setConnectionStatus((prev) => ({ ...prev, loading: true }));
      const response = await meetingService.getConnectionStatus();
      if (response.success) {
        setConnectionStatus({
          connected: response.data.connected || false,
          connectedEmail: response.data.connectedEmail || null,
          oAuthEnabled: response.data.oAuthEnabled !== false,
          loading: false,
        });
      }
    } catch (err) {
      console.error('Failed to fetch connection status:', err);
      setConnectionStatus((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Initiate OAuth flow
   * Redirects to Google OAuth page
   */
  const initiateOAuth = useCallback(async (returnTo = '/admin/meetings') => {
    try {
      const response = await meetingService.getAuthUrl(returnTo);
      if (response.success && response.data.authUrl) {
        // Redirect to Google OAuth page
        window.location.href = response.data.authUrl;
      }
    } catch (err) {
      console.error('Failed to initiate OAuth:', err);
      throw err;
    }
  }, []);

  /**
   * Disconnect Google account
   */
  const disconnectGoogle = useCallback(async () => {
    try {
      const response = await meetingService.disconnectGoogle();
      if (response.success) {
        await fetchConnectionStatus(); // Refresh status
        return true;
      }
    } catch (err) {
      console.error('Failed to disconnect Google account:', err);
      throw err;
    }
  }, [fetchConnectionStatus]);

  /**
   * Create a Google Meet meeting
   * Automatically handles OAuth if needed
   */
  const createGoogleMeeting = useCallback(async (meetingData) => {
    try {
      const response = await meetingService.createGoogleMeeting(meetingData);
      
      // Check if OAuth is required
      if (response.code === 'OAUTH_REQUIRED' || response.requiresOAuth) {
        // Initiate OAuth flow
        await initiateOAuth();
        return { requiresOAuth: true };
      }
      
      if (response.success) {
        // Refresh meetings list
        await fetchMeetings();
        return response.data;
      }
    } catch (err) {
      // Check if error indicates OAuth is required
      if (err.code === 'OAUTH_REQUIRED' || err.requiresOAuth || err.message?.includes('GOOGLE_OAUTH_REQUIRED')) {
        await initiateOAuth();
        return { requiresOAuth: true };
      }
      throw err;
    }
  }, [initiateOAuth, fetchMeetings]);

  /**
   * Fetch upcoming meetings (for children/parents)
   * @param {Number} limit - Number of meetings to fetch (default: 5)
   */
  const fetchUpcomingMeetings = useCallback(async (limit = 5) => {
    try {
      const response = await meetingService.getUpcomingMeetings(limit);
      if (response.success) {
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch upcoming meetings:', err);
      return [];
    }
  }, []);

  // Fetch connection status on mount
  useEffect(() => {
    fetchConnectionStatus();
  }, [fetchConnectionStatus]);

  return {
    // State
    meetings: meetingState.meetings,
    currentMeeting: meetingState.currentMeeting,
    pagination: meetingState.pagination,
    filters: meetingState.filters,
    loading: meetingState.loading,
    error: meetingState.error,
    connectionStatus,
    
    // Actions
    fetchMeetings,
    getMeetingById,
    updateMeeting,
    archiveMeeting,
    restoreMeeting,
    cancelMeeting,
    deleteMeeting,
    updateFilters,
    clearAllFilters,
    setCurrent,
    clearCurrent,
    clearErrorState,
    resetState,
    
    // Google OAuth Actions
    fetchConnectionStatus,
    initiateOAuth,
    disconnectGoogle,
    createGoogleMeeting,
    
    // Upcoming Meetings (for children/parents)
    fetchUpcomingMeetings,
  };
};

export default useMeetings;
