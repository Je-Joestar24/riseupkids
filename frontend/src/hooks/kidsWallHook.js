import { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllPostsForAdmin,
  approvePost,
  rejectPost,
  clearError,
  setFilters,
  clearFilters,
} from '../store/slices/kidsWallSlice';
import { showNotification } from '../store/slices/uiSlice';
import kidsWallService from '../services/kidsWallService';

/**
 * Custom hook for KidsWall management
 * 
 * Supports both admin and child operations:
 * - Admin: fetchPosts (with filters), approvePostById, rejectPostById
 * - Child: fetchPosts (feed), createPost, deletePost, toggleLike, toggleStar
 * 
 * @param {String} childId - Optional child ID. If provided, enables child operations
 */
const useKidsWall = (childId = null) => {
  const dispatch = useDispatch();
  const reduxState = useSelector((state) => state.kidsWall);
  
  // Local state for child operations
  const [childPosts, setChildPosts] = useState([]);
  const [childLoading, setChildLoading] = useState(false);
  const [childError, setChildError] = useState(null);

  // Determine if this is admin or child mode
  const isAdminMode = !childId;

  /**
   * Fetch posts
   * - Admin mode: Fetch with filters and pagination
   * - Child mode: Fetch feed (all approved posts)
   * @param {Object} params - Query parameters (admin only)
   * @returns {Promise} Fetch result
   */
  const fetchPosts = useCallback(async (params = null) => {
    if (isAdminMode) {
      // Admin mode: Use Redux
      try {
        const queryParams = params || reduxState.filters;
        const result = await dispatch(fetchAllPostsForAdmin(queryParams)).unwrap();
        return result;
      } catch (error) {
        dispatch(showNotification({
          message: error?.message || error || 'Failed to fetch posts',
          type: 'error',
        }));
        throw error;
      }
    } else {
      // Child mode: Use local state
      setChildLoading(true);
      setChildError(null);
      try {
        const response = await kidsWallService.getAllPosts();
        setChildPosts(response.data || []);
        return response;
      } catch (error) {
        const errorMessage = error?.message || error || 'Failed to fetch posts';
        setChildError(errorMessage);
        throw error;
      } finally {
        setChildLoading(false);
      }
    }
  }, [isAdminMode, childId, dispatch, reduxState.filters]);

  /**
   * Approve a pending post
   * @param {String} postId - Post ID
   * @returns {Promise} Approve result
   */
  const approvePostById = useCallback(async (postId) => {
    try {
      const result = await dispatch(approvePost(postId)).unwrap();
      
      dispatch(showNotification({
        message: 'Post approved successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to approve post',
        type: 'error',
      }));
      throw error;
    }
  }, [dispatch]);

  /**
   * Reject a post (soft delete)
   * @param {String} postId - Post ID
   * @returns {Promise} Reject result
   */
  const rejectPostById = useCallback(async (postId) => {
    try {
      const result = await dispatch(rejectPost(postId)).unwrap();
      
      dispatch(showNotification({
        message: 'Post rejected successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to reject post',
        type: 'error',
      }));
      throw error;
    }
  }, [dispatch]);

  /**
   * Update filters
   * @param {Object} newFilters - Filter values to update
   */
  const updateFilters = useCallback((newFilters) => {
    dispatch(setFilters(newFilters));
  }, [dispatch]);

  /**
   * Clear all filters
   */
  const resetFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  /**
   * Clear error state
   */
  const clearKidsWallError = () => {
    if (isAdminMode) {
      dispatch(clearError());
    } else {
      setChildError(null);
    }
  };

  // ========== Child Operations ==========

  /**
   * Create a new post (child mode only)
   * @param {Object} postData - Post data (title, content)
   * @param {File} imageFile - Image file
   * @returns {Promise} Create result
   */
  const createPost = useCallback(async (postData, imageFile) => {
    if (!childId) {
      throw new Error('createPost is only available in child mode');
    }
    
    setChildLoading(true);
    setChildError(null);
    try {
      const response = await kidsWallService.createPost(childId, postData, imageFile);
      
      // Show child-friendly success message
      dispatch(showNotification({
        message: 'Awesome! A grown-up will check it soon!',
        type: 'success',
        duration: 5000, // 5 seconds so child can read it
      }));
      
      // Refresh posts after creation
      await fetchPosts();
      return response;
    } catch (error) {
      const errorMessage = error?.message || error || 'Failed to create post';
      setChildError(errorMessage);
      
      // Show child-friendly error message
      dispatch(showNotification({
        message: 'Oops! Something went wrong. Please ask a grown-up for help!',
        type: 'error',
      }));
      
      throw error;
    } finally {
      setChildLoading(false);
    }
  }, [childId, fetchPosts, dispatch]);

  /**
   * Delete a post (child mode only)
   * @param {String} postId - Post ID
   * @returns {Promise} Delete result
   */
  const deletePost = useCallback(async (postId) => {
    if (!childId) {
      throw new Error('deletePost is only available in child mode');
    }
    
    setChildLoading(true);
    setChildError(null);
    try {
      const response = await kidsWallService.deletePost(postId, childId);
      // Refresh posts after deletion
      await fetchPosts();
      return response;
    } catch (error) {
      const errorMessage = error?.message || error || 'Failed to delete post';
      setChildError(errorMessage);
      throw error;
    } finally {
      setChildLoading(false);
    }
  }, [childId, fetchPosts]);

  /**
   * Toggle like on a post (child mode only)
   * @param {String} postId - Post ID
   * @returns {Promise} Toggle result
   */
  const toggleLike = useCallback(async (postId) => {
    if (!childId) {
      throw new Error('toggleLike is only available in child mode');
    }
    
    try {
      const response = await kidsWallService.toggleLike(postId, childId);
      // Update local posts state
      setChildPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId ? response.data : post
        )
      );
      return response;
    } catch (error) {
      const errorMessage = error?.message || error || 'Failed to toggle like';
      setChildError(errorMessage);
      throw error;
    }
  }, [childId]);

  /**
   * Toggle star on a post (child mode only)
   * @param {String} postId - Post ID
   * @returns {Promise} Toggle result
   */
  const toggleStar = useCallback(async (postId) => {
    if (!childId) {
      throw new Error('toggleStar is only available in child mode');
    }
    
    try {
      const response = await kidsWallService.toggleStar(postId, childId);
      // Update local posts state
      setChildPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId ? response.data : post
        )
      );
      return response;
    } catch (error) {
      const errorMessage = error?.message || error || 'Failed to toggle star';
      setChildError(errorMessage);
      throw error;
    }
  }, [childId]);

  // Return appropriate state and methods based on mode
  if (isAdminMode) {
    // Admin mode: Return Redux state and admin methods
    return {
      // State
      posts: reduxState.posts,
      pagination: reduxState.pagination,
      filters: reduxState.filters,
      loading: reduxState.loading,
      error: reduxState.error,
      
      // Actions
      fetchPosts,
      approvePostById,
      rejectPostById,
      updateFilters,
      resetFilters,
      clearKidsWallError,
    };
  } else {
    // Child mode: Return local state and child methods
    return {
      // State
      posts: childPosts,
      loading: childLoading,
      error: childError,
      
      // Actions
      fetchPosts,
      createPost,
      deletePost,
      toggleLike,
      toggleStar,
      clearKidsWallError,
    };
  }
};

// Export both named and default for backward compatibility
export { useKidsWall };
export default useKidsWall;
