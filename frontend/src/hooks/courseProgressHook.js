import { useState, useEffect, useCallback } from 'react';
import courseProgressService from '../services/courseProgressService';
import videoWatchService from '../services/videoWatchService';
import bookReadingService from '../services/bookReadingService';
import { showNotification } from '../store/slices/uiSlice';
import { useDispatch } from 'react-redux';

/**
 * Custom hook for course progress management
 * 
 * Provides easy access to child course progress and management methods
 */
export const useCourseProgress = (childId) => {
  const dispatch = useDispatch();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all courses with progress for a child
   * @param {Object} params - Optional query parameters (status, isDefault)
   * @returns {Promise} Fetch result
   */
  const fetchChildCourses = useCallback(async (params = {}) => {
    if (!childId) {
      setError('Child ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await courseProgressService.getChildCourses(childId, params);
      if (response.success && response.data) {
        setCourses(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch courses');
      }
    } catch (err) {
      const errorMessage = err || 'Failed to fetch child courses';
      setError(errorMessage);
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [childId, dispatch]);

  /**
   * Get course progress for a specific course
   * @param {String} courseId - Course's ID
   * @returns {Promise} Course progress data
   */
  const fetchCourseProgress = useCallback(async (courseId) => {
    if (!childId || !courseId) {
      throw new Error('Child ID and Course ID are required');
    }

    try {
      const response = await courseProgressService.getCourseProgress(courseId, childId);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch course progress');
      }
    } catch (err) {
      const errorMessage = err || 'Failed to fetch course progress';
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      throw err;
    }
  }, [childId, dispatch]);

  /**
   * Check if child can access a course
   * @param {String} courseId - Course's ID
   * @returns {Promise} Access information
   */
  const checkAccess = useCallback(async (courseId) => {
    if (!childId || !courseId) {
      throw new Error('Child ID and Course ID are required');
    }

    try {
      const response = await courseProgressService.checkCourseAccess(courseId, childId);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to check course access');
      }
    } catch (err) {
      const errorMessage = err || 'Failed to check course access';
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      throw err;
    }
  }, [childId, dispatch]);

  /**
   * Update course progress when content is completed
   * @param {String} courseId - Course's ID
   * @param {String} contentId - Content item's ID
   * @param {String} contentType - Content type
   * @returns {Promise} Updated progress
   */
  const updateProgress = useCallback(async (courseId, contentId, contentType) => {
    if (!childId || !courseId || !contentId || !contentType) {
      throw new Error('All parameters are required');
    }

    try {
      const response = await courseProgressService.updateContentProgress(
        courseId,
        childId,
        contentId,
        contentType
      );
      
      if (response.success) {
        dispatch(showNotification({
          message: 'Progress updated successfully!',
          type: 'success',
        }));
        
        // Refresh courses list
        await fetchChildCourses();
        
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update progress');
      }
    } catch (err) {
      const errorMessage = err || 'Failed to update progress';
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      throw err;
    }
  }, [childId, dispatch, fetchChildCourses]);

  /**
   * Mark course as completed
   * @param {String} courseId - Course's ID
   * @returns {Promise} Updated progress
   */
  const completeCourse = useCallback(async (courseId) => {
    if (!childId || !courseId) {
      throw new Error('Child ID and Course ID are required');
    }

    try {
      const response = await courseProgressService.markCourseCompleted(courseId, childId);
      
      if (response.success) {
        dispatch(showNotification({
          message: 'Course marked as completed!',
          type: 'success',
        }));
        
        // Refresh courses list
        await fetchChildCourses();
        
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to mark course as completed');
      }
    } catch (err) {
      const errorMessage = err || 'Failed to mark course as completed';
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      throw err;
    }
  }, [childId, dispatch, fetchChildCourses]);

  /**
   * Get course details with populated contents and child profile
   * @param {String} courseId - Course's ID
   * @returns {Promise} Course details with contents, child profile, and progress
   */
  const fetchCourseDetailsForChild = useCallback(async (courseId) => {
    if (!childId || !courseId) {
      throw new Error('Child ID and Course ID are required');
    }

    try {
      const response = await courseProgressService.getCourseDetailsForChild(courseId, childId);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch course details');
      }
    } catch (err) {
      const errorMessage = err || 'Failed to fetch course details';
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      throw err;
    }
  }, [childId, dispatch]);

  /**
   * Get full URL for course cover image
   * @param {String} coverImagePath - Relative cover image path
   * @returns {String} Full URL for the cover image
   */
  const getCoverImageUrl = useCallback((coverImagePath) => {
    if (!coverImagePath) return null;
    
    // If already a full URL, return as-is
    if (coverImagePath.startsWith('http://') || coverImagePath.startsWith('https://')) {
      return coverImagePath;
    }
    
    // Build full URL from relative path
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${coverImagePath.startsWith('/') ? coverImagePath : `/${coverImagePath}`}`;
  }, []);

  /**
   * Calculate summary counts from courses
   * @returns {Object} { completed, current, locked }
   */
  const getSummaryCounts = useCallback(() => {
    if (!courses || courses.length === 0) {
      return { completed: 0, current: 0, locked: 0 };
    }
    
    const completed = courses.filter(c => c.status === 'completed').length;
    const current = courses.filter(c => c.status === 'in_progress' || c.status === 'not_started').length;
    const locked = courses.filter(c => c.status === 'locked').length;
    
    return { completed, current, locked };
  }, [courses]);

  /**
   * Mark video as watched (completed)
   * Increments watch count and awards stars when required count is reached
   * @param {String} videoId - Video's ID (Media ID)
   * @param {Number} [completionPercentage] - Optional completion percentage (0-100, default: 100)
   * @returns {Promise} Watch result with star award info
   */
  const markVideoWatched = useCallback(async (videoId, completionPercentage = 100) => {
    if (!childId || !videoId) {
      throw new Error('Child ID and Video ID are required');
    }

    try {
      const response = await videoWatchService.markVideoWatched(videoId, childId, completionPercentage);
      
      if (response.success && response.data) {
        const { videoWatch, requiredWatchCount, starsAwarded, starsAwardedAt, starsToAward } = response.data;
        
        // Show success notification
        if (starsAwarded && starsAwardedAt) {
          // Stars were just awarded - show celebratory message
          dispatch(showNotification({
            message: `🎉 Awesome! You earned ${starsToAward} stars for watching this video ${requiredWatchCount} times! 🎉`,
            type: 'success',
            duration: 5000,
          }));
        } else {
          // Video watched but stars not yet awarded
          const currentCount = videoWatch?.watchCount || 0;
          const remaining = Math.max(0, requiredWatchCount - currentCount);
          if (remaining > 0) {
            dispatch(showNotification({
              message: `Great job! Watch ${remaining} more time${remaining > 1 ? 's' : ''} to earn ${starsToAward} stars! ⭐`,
              type: 'success',
              duration: 3000,
            }));
          }
        }
        
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to record video watch');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (err || 'Failed to record video watch');
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      throw new Error(errorMessage);
    }
  }, [childId, dispatch]);

  /**
   * Get video watch status for a child
   * @param {String} videoId - Video's ID (Media ID)
   * @returns {Promise} Watch status data
   */
  const getVideoWatchStatus = useCallback(async (videoId) => {
    if (!childId || !videoId) {
      throw new Error('Child ID and Video ID are required');
    }

    try {
      const response = await videoWatchService.getVideoWatchStatus(videoId, childId);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get video watch status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (err || 'Failed to get video watch status');
      // Don't show notification for status checks (might be called frequently)
      throw new Error(errorMessage);
    }
  }, [childId]);

  /**
   * Get all video watch statuses for a child
   * @returns {Promise} Array of video watch statuses
   */
  const getChildVideoWatches = useCallback(async () => {
    if (!childId) {
      throw new Error('Child ID is required');
    }

    try {
      const response = await videoWatchService.getChildVideoWatches(childId);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get child video watches');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (err || 'Failed to get child video watches');
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      throw new Error(errorMessage);
    }
  }, [childId, dispatch]);

  /**
   * Reset video watch count for a child (admin/parent action)
   * @param {String} videoId - Video's ID (Media ID)
   * @returns {Promise} Reset result
   */
  const resetVideoWatch = useCallback(async (videoId) => {
    if (!childId || !videoId) {
      throw new Error('Child ID and Video ID are required');
    }

    try {
      const response = await videoWatchService.resetVideoWatch(videoId, childId);
      if (response.success) {
        dispatch(showNotification({
          message: 'Video watch count reset successfully!',
          type: 'success',
        }));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to reset video watch');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (err || 'Failed to reset video watch');
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      throw new Error(errorMessage);
    }
  }, [childId, dispatch]);

  /**
   * Get book reading status for a specific book
   * @param {String} bookId - Book's ID
   * @returns {Promise} Reading status data
   */
  const getBookReadingStatus = useCallback(async (bookId) => {
    if (!childId || !bookId) {
      throw new Error('Child ID and Book ID are required');
    }

    try {
      const response = await bookReadingService.getBookReadingStatus(bookId, childId);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get book reading status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (err || 'Failed to get book reading status');
      // Don't show notification for status checks (might be called frequently)
      throw new Error(errorMessage);
    }
  }, [childId]);

  /**
   * Get all book reading statuses for a child
   * @returns {Promise} Array of book reading statuses
   */
  const getChildBookReadings = useCallback(async () => {
    if (!childId) {
      throw new Error('Child ID is required');
    }

    try {
      const response = await bookReadingService.getChildBookReadings(childId);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get child book readings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (err || 'Failed to get child book readings');
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
      throw new Error(errorMessage);
    }
  }, [childId, dispatch]);

  return {
    // State
    courses,
    loading,
    error,
    // Methods
    fetchChildCourses,
    fetchCourseProgress,
    fetchCourseDetailsForChild,
    checkAccess,
    updateProgress,
    completeCourse,
    // Video Watch Methods
    markVideoWatched,
    getVideoWatchStatus,
    getChildVideoWatches,
    resetVideoWatch,
    // Book Reading Methods
    getBookReadingStatus,
    getChildBookReadings,
    // Helpers
    getCoverImageUrl,
    getSummaryCounts,
  };
};

export default useCourseProgress;
