import api from '../api/axios';

/**
 * Book Reading Service
 * 
 * Service for managing book reading tracking:
 * - Get book reading status for a child
 * - Get all book readings for a child
 */
const bookReadingService = {
  /**
   * Get book reading status for a specific book and child
   * @param {String} bookId - Book's ID
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with reading status
   */
  getBookReadingStatus: async (bookId, childId) => {
    try {
      const response = await api.get(`/book-reading/${bookId}/child/${childId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get book reading status';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all book reading statuses for a child
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with all book readings
   */
  getChildBookReadings: async (childId) => {
    try {
      const response = await api.get(`/book-reading/child/${childId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get child book readings';
      throw new Error(errorMessage);
    }
  },
};

export default bookReadingService;
