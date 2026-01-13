import api from '../api/axios';

/**
 * KidsWall Service
 * 
 * Service for managing KidsWall posts:
 * - Get all posts for a child
 * - Get single post by ID
 * - Create new post with image
 * - Update existing post
 * - Delete post
 */

const kidsWallService = {
  /**
   * Get all posts (feed - all children)
   * @param {Object} params - Optional query parameters (isApproved, isActive)
   * @returns {Promise} API response with posts data
   */
  getAllPosts: async (params = {}) => {
    try {
      // Default to showing only approved and active posts
      const queryParams = {
        isApproved: params.isApproved !== undefined ? params.isApproved : true,
        isActive: params.isActive !== undefined ? params.isActive : true,
        ...params,
      };
      
      const response = await api.get('/kids-wall/all', { params: queryParams });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch posts';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all posts for a specific child
   * @param {String} childId - Child's ID
   * @param {Object} params - Optional query parameters (isApproved, isActive)
   * @returns {Promise} API response with posts data
   */
  getChildPosts: async (childId, params = {}) => {
    try {
      const response = await api.get(`/kids-wall/child/${childId}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Get single post by ID
   * @param {String} postId - Post's ID
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with post data
   */
  getPostById: async (postId, childId) => {
    try {
      const response = await api.get(`/kids-wall/${postId}/child/${childId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Create new post with image
   * @param {String} childId - Child's ID
   * @param {Object} postData - Post data (title, content)
   * @param {File} imageFile - Image file to upload
   * @returns {Promise} API response with created post
   */
  createPost: async (childId, postData, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('title', postData.title);
      formData.append('content', postData.content);
      formData.append('image', imageFile);

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
   * Update existing post
   * @param {String} postId - Post's ID
   * @param {String} childId - Child's ID
   * @param {Object} postData - Updated post data (title, content)
   * @param {File} imageFile - Optional new image file
   * @returns {Promise} API response with updated post
   */
  updatePost: async (postId, childId, postData, imageFile = null) => {
    try {
      const formData = new FormData();
      if (postData.title) formData.append('title', postData.title);
      if (postData.content) formData.append('content', postData.content);
      if (imageFile) formData.append('image', imageFile);

      const response = await api.patch(`/kids-wall/${postId}/child/${childId}`, formData, {
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
   * Delete post (soft delete)
   * @param {String} postId - Post's ID
   * @param {String} childId - Child's ID
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
   * @param {String} postId - Post's ID
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with updated post
   */
  toggleLike: async (postId, childId) => {
    try {
      const response = await api.post(`/kids-wall/${postId}/like/child/${childId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to toggle like';
      throw new Error(errorMessage);
    }
  },

  /**
   * Toggle star on a post
   * @param {String} postId - Post's ID
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with updated post
   */
  toggleStar: async (postId, childId) => {
    try {
      const response = await api.post(`/kids-wall/${postId}/star/child/${childId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to toggle star';
      throw new Error(errorMessage);
    }
  },
};

export default kidsWallService;
