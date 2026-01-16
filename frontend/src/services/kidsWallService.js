import api from '../api/axios';

/**
 * KidsWall Service
 * 
 * Service for managing KidsWall posts:
 * - Admin operations: Get posts with pagination/filters, approve, reject
 * - Child operations: Get feed, create post, delete post, toggle like/star
 */

const kidsWallService = {
  // ========== Admin Operations ==========
  
  /**
   * Get all posts for admin with pagination and filters
   * @param {Object} params - Query parameters
   * @param {Number} params.page - Page number (default: 1)
   * @param {Number} params.limit - Items per page (default: 10)
   * @param {String} params.isApproved - Filter by approval status (true/false/pending)
   * @param {String} params.childName - Search by child's displayName
   * @param {String} params.search - Search in post title/content
   * @returns {Promise} API response with posts data and pagination
   */
  getAllPostsForAdmin: async (params = {}) => {
    try {
      const response = await api.get('/kids-wall/admin/posts', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Approve a pending post
   * @param {String} postId - Post ID
   * @returns {Promise} API response with approved post data
   */
  approvePost: async (postId) => {
    try {
      const response = await api.post(`/kids-wall/admin/${postId}/approve`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Reject a post (soft delete)
   * @param {String} postId - Post ID
   * @returns {Promise} API response
   */
  rejectPost: async (postId) => {
    try {
      const response = await api.post(`/kids-wall/admin/${postId}/reject`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  // ========== Child Operations ==========

  /**
   * Get all posts (feed) - shows approved posts from all children
   * @returns {Promise} API response with posts array
   */
  getAllPosts: async () => {
    try {
      const response = await api.get('/kids-wall/all');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Get all posts for a specific child
   * @param {String} childId - Child ID
   * @returns {Promise} API response with posts array
   */
  getChildPosts: async (childId) => {
    try {
      const response = await api.get(`/kids-wall/child/${childId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Create a new post
   * @param {String} childId - Child ID
   * @param {Object} postData - Post data (title, content)
   * @param {File} imageFile - Image file
   * @returns {Promise} API response with created post
   */
  createPost: async (childId, postData, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('title', postData.title);
      formData.append('content', postData.content);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await api.post(`/kids-wall/child/${childId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Delete a post
   * @param {String} postId - Post ID
   * @param {String} childId - Child ID
   * @returns {Promise} API response
   */
  deletePost: async (postId, childId) => {
    try {
      const response = await api.delete(`/kids-wall/${postId}/child/${childId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Toggle like on a post
   * @param {String} postId - Post ID
   * @param {String} childId - Child ID
   * @returns {Promise} API response with updated post
   */
  toggleLike: async (postId, childId) => {
    try {
      const response = await api.post(`/kids-wall/${postId}/like/child/${childId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Toggle star on a post
   * @param {String} postId - Post ID
   * @param {String} childId - Child ID
   * @returns {Promise} API response with updated post
   */
  toggleStar: async (postId, childId) => {
    try {
      const response = await api.post(`/kids-wall/${postId}/star/child/${childId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },
};

export default kidsWallService;
