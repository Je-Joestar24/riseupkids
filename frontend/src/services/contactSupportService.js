import api from '../api/axios';

/**
 * Contact Support Service
 * 
 * Service for contact support API calls
 */
const contactSupportService = {
  /**
   * Submit a contact support message
   * @param {String} email - Email address
   * @param {String} subject - Subject type
   * @param {String} message - Message content
   * @returns {Promise} API response
   */
  submitContactMessage: async (email, subject, message) => {
    try {
      const response = await api.post('/contact-support', {
        email,
        subject,
        message,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Get current user's contact messages
   * @param {Object} pagination - Pagination options (page, limit)
   * @returns {Promise} API response
   */
  getMyContactMessages: async (pagination = {}) => {
    try {
      const { page = 1, limit = 20 } = pagination;
      const response = await api.get(`/contact-support/my-messages?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },
};

export default contactSupportService;
