import axios from '../api/axios';

/**
 * SCORM Service
 * 
 * Service layer for interacting with SCORM backend API
 * Provides functions for launching SCORM content and managing progress
 */

/**
 * Get SCORM launch URL
 * @param {string} contentId - Content item ID (AudioAssignment, Chant, Book, or Video/Media)
 * @param {string} contentType - Content type ('audioAssignment', 'chant', 'book', or 'video')
 * @returns {Promise<Object>} Launch URL data
 */
export const launchScorm = async (contentId, contentType) => {
  try {
    const response = await axios.get(
      `/scorm/${contentId}/launch?contentType=${contentType}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Failed to launch SCORM content'
    );
  }
};

/**
 * Save SCORM progress
 * @param {string} contentId - Content item ID
 * @param {string} contentType - Content type ('audioAssignment', 'chant', 'book', or 'video')
 * @param {Object} progressData - Progress data object
 * @returns {Promise<Object>} Save result
 */
export const saveProgress = async (contentId, contentType, progressData) => {
  try {
    const response = await axios.post(`/scorm/${contentId}/progress`, {
      contentType,
      progressData,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Failed to save SCORM progress'
    );
  }
};

/**
 * Get SCORM progress
 * @param {string} contentId - Content item ID
 * @param {string} contentType - Content type ('audioAssignment', 'chant', 'book', or 'video')
 * @returns {Promise<Object>} Progress data
 */
export const getProgress = async (contentId, contentType) => {
  try {
    const response = await axios.get(
      `/scorm/${contentId}/progress?contentType=${contentType}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Failed to get SCORM progress'
    );
  }
};

export default {
  launchScorm,
  saveProgress,
  getProgress,
};
