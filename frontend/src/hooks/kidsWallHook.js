import { useState, useCallback } from 'react';
import kidsWallService from '../services/kidsWallService';
import { showNotification } from '../store/slices/uiSlice';
import { useDispatch } from 'react-redux';

/**
 * Custom hook for KidsWall management
 * 
 * Provides easy access to KidsWall posts and management methods
 */
const useKidsWall = (childId) => {
  const dispatch = useDispatch();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all posts (feed - all children)
   * @param {Object} filters - Optional filters (isApproved, isActive)
   * @returns {Promise} Fetch result
   */
  const fetchPosts = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all posts (feed view) - no childId needed
      const response = await kidsWallService.getAllPosts(filters);
      
      if (response && response.success && response.data) {
        setPosts(response.data);
        return response.data;
      } else {
        const errorMsg = response?.message || 'Failed to fetch posts';
        setError(errorMsg);
        dispatch(showNotification({
          message: errorMsg,
          type: 'error',
        }));
        return [];
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      
      let errorMessage = 'Failed to fetch posts';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Only show notification for non-network errors
      if (errorMessage !== 'Network Error' && errorMessage !== 'Failed to fetch posts') {
        try {
          dispatch(showNotification({
            message: errorMessage,
            type: 'error',
          }));
        } catch (dispatchError) {
          console.error('Error dispatching notification:', dispatchError);
        }
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * Create new post with image
   * @param {Object} postData - Post data (title, content)
   * @param {File} imageFile - Image file
   * @returns {Promise} Created post
   */
  const createPost = useCallback(async (postData, imageFile) => {
    if (!childId) {
      throw new Error('Child ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await kidsWallService.createPost(childId, postData, imageFile);
      if (response.success && response.data) {
        // Refresh posts list (feed)
        await fetchPosts();
        dispatch(showNotification({
          message: 'Post created successfully!',
          type: 'success',
        }));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create post');
      }
    } catch (err) {
      let errorMessage = 'Failed to create post';
      
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && err.message) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object') {
        errorMessage = String(err);
      }
      
      setError(errorMessage);
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      
      // Re-throw as Error object for proper error handling
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [childId, dispatch, fetchPosts]);

  /**
   * Update existing post
   * @param {String} postId - Post ID
   * @param {Object} postData - Updated post data
   * @param {File} imageFile - Optional new image file
   * @returns {Promise} Updated post
   */
  const updatePost = useCallback(async (postId, postData, imageFile = null) => {
    if (!childId) {
      throw new Error('Child ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await kidsWallService.updatePost(postId, childId, postData, imageFile);
      if (response.success && response.data) {
        // Refresh posts list
        await fetchPosts();
        dispatch(showNotification({
          message: 'Post updated successfully!',
          type: 'success',
        }));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update post');
      }
    } catch (err) {
      let errorMessage = 'Failed to update post';
      
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && err.message) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object') {
        errorMessage = String(err);
      }
      
      setError(errorMessage);
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      
      // Re-throw as Error object for proper error handling
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [childId, dispatch, fetchPosts]);

  /**
   * Delete post
   * @param {String} postId - Post ID
   * @returns {Promise} Deletion result
   */
  const deletePost = useCallback(async (postId) => {
    if (!childId) {
      throw new Error('Child ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await kidsWallService.deletePost(postId, childId);
      if (response.success) {
        // Refresh posts list
        await fetchPosts();
        dispatch(showNotification({
          message: 'Post deleted successfully!',
          type: 'success',
        }));
        return response;
      } else {
        throw new Error(response.message || 'Failed to delete post');
      }
    } catch (err) {
      let errorMessage = 'Failed to delete post';
      
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && err.message) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object') {
        errorMessage = String(err);
      }
      
      setError(errorMessage);
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      
      // Re-throw as Error object for proper error handling
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [childId, dispatch, fetchPosts]);

  /**
   * Refresh posts list
   * @param {Object} filters - Optional filters
   */
  const refreshPosts = useCallback(async (filters = {}) => {
    await fetchPosts(filters);
  }, [fetchPosts]);

  return {
    // State
    posts,
    loading,
    error,
    // Methods
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    refreshPosts,
  };
};

export default useKidsWall;
