import { useState, useEffect, useCallback } from 'react';
import courseProgressService from '../services/courseProgressService';
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
    // Helpers
    getCoverImageUrl,
    getSummaryCounts,
  };
};

export default useCourseProgress;
