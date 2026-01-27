import api from '../api/axios';

/**
 * Meeting Service
 * 
 * Handles all meeting-related API calls for database meetings
 * Includes CRUD operations, archiving, restoring, and cancellation
 * Also includes Google OAuth integration for meeting creation
 */

const meetingService = {
  /**
   * Get Google OAuth authorization URL
   * @param {String} returnTo - Optional return path after OAuth
   * @returns {Promise} API response with authUrl and state
   */
  getAuthUrl: async (returnTo = '/admin/meetings') => {
    try {
      const response = await api.get('/google/oauth/url', {
        params: { returnTo },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get Google connection status
   * @returns {Promise} API response with connection status
   */
  getConnectionStatus: async () => {
    try {
      const response = await api.get('/google/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Disconnect Google account
   * @returns {Promise} API response
   */
  disconnectGoogle: async () => {
    try {
      const response = await api.post('/google/disconnect');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Create a Google Meet meeting (creates both Google Calendar event and database record)
   * @param {Object} meetingData - Meeting details
   * @param {String} meetingData.summary - Meeting title
   * @param {String} meetingData.description - Meeting description (optional)
   * @param {Date|String} meetingData.startTime - Start time (ISO string or Date)
   * @param {Date|String} meetingData.endTime - End time (ISO string or Date)
   * @param {String} meetingData.timeZone - Timezone (e.g., 'America/New_York')
   * @param {Array<String>} meetingData.attendees - Email addresses (optional)
   * @returns {Promise} API response with meeting data
   */
  createGoogleMeeting: async (meetingData) => {
    try {
      const response = await api.post('/google/meetings', meetingData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  /**
   * Get all meetings with filters and pagination
   * @param {Object} params - Query parameters
   * @param {String} params.status - Filter by status (scheduled, completed, cancelled)
   * @param {Boolean} params.isArchived - Filter by archived status
   * @param {String} params.search - Search term
   * @param {String} params.startDate - Filter by start date (ISO string)
   * @param {String} params.endDate - Filter by end date (ISO string)
   * @param {String} params.relatedCourse - Filter by course ID
   * @param {String} params.relatedLesson - Filter by lesson ID
   * @param {String} params.createdBy - Filter by creator ID (admin only)
   * @param {Number} params.page - Page number (default: 1)
   * @param {Number} params.limit - Items per page (default: 10)
   * @param {String} params.sortBy - Sort field (default: 'startTime')
   * @param {String} params.sortOrder - Sort order: 'asc' or 'desc' (default: 'desc')
   * @returns {Promise} API response with meetings and pagination
   */
  getAllMeetings: async (params = {}) => {
    try {
      const response = await api.get('/meetings', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get meeting by ID
   * @param {String} id - Meeting ID
   * @returns {Promise} API response with meeting data
   */
  getMeetingById: async (id) => {
    try {
      const response = await api.get(`/meetings/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update a meeting
   * @param {String} id - Meeting ID
   * @param {Object} updates - Fields to update
   * @param {String} updates.title - Meeting title
   * @param {String} updates.description - Meeting description
   * @param {Date|String} updates.startTime - Start time (ISO string)
   * @param {Date|String} updates.endTime - End time (ISO string)
   * @param {String} updates.timeZone - Timezone
   * @param {Array<String>} updates.attendees - Email addresses
   * @param {String} updates.status - Meeting status
   * @param {String} updates.relatedCourse - Related course ID
   * @param {String} updates.relatedLesson - Related lesson ID
   * @param {Object} updates.metadata - Additional metadata
   * @returns {Promise} API response with updated meeting data
   */
  updateMeeting: async (id, updates) => {
    try {
      const response = await api.patch(`/meetings/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Archive a meeting
   * @param {String} id - Meeting ID
   * @returns {Promise} API response with archived meeting data
   */
  archiveMeeting: async (id) => {
    try {
      const response = await api.post(`/meetings/${id}/archive`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Restore an archived meeting
   * @param {String} id - Meeting ID
   * @returns {Promise} API response with restored meeting data
   */
  restoreMeeting: async (id) => {
    try {
      const response = await api.post(`/meetings/${id}/restore`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Cancel a meeting
   * @param {String} id - Meeting ID
   * @returns {Promise} API response with cancelled meeting data
   */
  cancelMeeting: async (id) => {
    try {
      const response = await api.post(`/meetings/${id}/cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Delete a meeting permanently
   * @param {String} id - Meeting ID
   * @returns {Promise} API response
   */
  deleteMeeting: async (id) => {
    try {
      const response = await api.delete(`/meetings/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get upcoming meetings (for children/parents)
   * @param {Number} limit - Number of meetings to return (default: 5)
   * @returns {Promise} API response with upcoming meetings
   */
  getUpcomingMeetings: async (limit = 5) => {
    try {
      const response = await api.get('/meetings/upcoming', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Generate a guest-mode Google Meet link
   * Forces guest access even if parent's Google account is logged in
   * @param {String} meetLink - Original Google Meet link
   * @returns {String} Guest-mode meet link
   */
  getGuestModeLink: (meetLink) => {
    if (!meetLink) return null;
    
    try {
      const url = new URL(meetLink);
      // Add parameters to force guest mode
      // authuser=0 forces guest mode
      // hs=122 is another parameter that helps ensure guest access
      url.searchParams.set('authuser', '0');
      url.searchParams.set('hs', '122');
      return url.toString();
    } catch (error) {
      // If URL parsing fails, try to append parameters manually
      const separator = meetLink.includes('?') ? '&' : '?';
      return `${meetLink}${separator}authuser=0&hs=122`;
    }
  },
};

export default meetingService;
