import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllCourses,
  createCourse,
  fetchCourseById,
  updateCourse,
  deleteCourse,
  clearError,
  setFilters,
  clearFilters,
  clearCurrentCourse,
} from '../store/slices/courseSlice';
import { showNotification } from '../store/slices/uiSlice';

/**
 * Custom hook for course/content collection management
 * 
 * Provides easy access to course state and management methods
 * Handles CRUD operations for courses with mixed content types
 */
export const useCourse = () => {
  const dispatch = useDispatch();
  const {
    courses,
    currentCourse,
    pagination,
    filters,
    loading,
    error,
  } = useSelector((state) => state.course);

  /**
   * Fetch all courses with filters
   * @param {Object} params - Query parameters (optional, uses current filters if not provided)
   * @returns {Promise} Fetch result
   */
  const fetchCourses = async (params = null) => {
    try {
      const queryParams = params || filters;
      const result = await dispatch(fetchAllCourses(queryParams)).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch courses',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Create new course
   * @param {FormData} formData - Course data with files (coverImage, contents JSON string, etc.)
   * @returns {Promise} Create result
   */
  const createNewCourse = async (formData) => {
    try {
      const result = await dispatch(createCourse(formData)).unwrap();
      
      dispatch(showNotification({
        message: 'Course created successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to create course',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Update filters
   * @param {Object} newFilters - Filter values to update
   */
  const updateFilters = (newFilters) => {
    dispatch(setFilters(newFilters));
  };

  /**
   * Clear all filters
   */
  const resetFilters = () => {
    dispatch(clearFilters());
  };

  /**
   * Fetch single course by ID
   * @param {String} courseId - Course's ID
   * @returns {Promise} Fetch result
   */
  const fetchCourse = async (courseId) => {
    try {
      const result = await dispatch(fetchCourseById(courseId)).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch course',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Update course
   * @param {String} courseId - Course's ID
   * @param {FormData} formData - Course data with optional files
   * @returns {Promise} Update result
   */
  const updateCourseData = async (courseId, formData) => {
    try {
      const result = await dispatch(updateCourse({ courseId, formData })).unwrap();
      
      dispatch(showNotification({
        message: 'Course updated successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to update course',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Delete course
   * @param {String} courseId - Course's ID
   * @returns {Promise} Delete result
   */
  const deleteCourseData = async (courseId) => {
    try {
      const result = await dispatch(deleteCourse(courseId)).unwrap();
      
      dispatch(showNotification({
        message: 'Course deleted successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to delete course',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Clear error state
   */
  const clearCourseError = () => {
    dispatch(clearError());
  };

  /**
   * Clear current course
   */
  const clearCourse = () => {
    dispatch(clearCurrentCourse());
  };

  /**
   * Prepare FormData for course creation/update
   * @param {Object} courseData - Course data object
   * @param {File} coverImageFile - Optional cover image file
   * @returns {FormData} FormData object ready for API call
   */
  const prepareCourseFormData = (courseData, coverImageFile = null) => {
    const formData = new FormData();
    
    // Add basic fields
    if (courseData.title) formData.append('title', courseData.title);
    if (courseData.description) formData.append('description', courseData.description);
    if (courseData.isPublished !== undefined) {
      formData.append('isPublished', courseData.isPublished);
    }
    
    // Add tags as JSON string
    if (courseData.tags && Array.isArray(courseData.tags)) {
      formData.append('tags', JSON.stringify(courseData.tags));
    }
    
    // Add contents as JSON string
    if (courseData.contents && Array.isArray(courseData.contents)) {
      formData.append('contents', JSON.stringify(courseData.contents));
    }
    
    // Add cover image file if provided
    if (coverImageFile) {
      formData.append('coverImage', coverImageFile);
    }
    
    return formData;
  };

  /**
   * Get content type label for display
   * @param {String} contentType - Content type (Activity, Book, Media, AudioAssignment)
   * @returns {String} Human-readable label
   */
  const getContentTypeLabel = (contentType) => {
    const labels = {
      'Activity': 'Activity',
      'Book': 'Book',
      'Media': 'Video',
      'AudioAssignment': 'Audio Assignment',
    };
    return labels[contentType] || contentType;
  };

  /**
   * Group course contents by content type
   * @param {Array} contents - Array of content items
   * @returns {Object} Grouped contents by type
   */
  const groupContentsByType = (contents = []) => {
    const grouped = {
      Activity: [],
      Book: [],
      Media: [],
      AudioAssignment: [],
    };
    
    contents.forEach((content) => {
      const type = content.contentType;
      if (grouped[type]) {
        grouped[type].push(content);
      }
    });
    
    // Sort each group by order
    Object.keys(grouped).forEach((type) => {
      grouped[type].sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    
    return grouped;
  };

  /**
   * Get full URL for course cover image
   * @param {String} coverImagePath - Relative cover image path (e.g., /uploads/courses/...)
   * @returns {String} Full URL for the cover image
   */
  const getCoverImageUrl = (coverImagePath) => {
    if (!coverImagePath) return null;
    
    // If already a full URL, return as-is
    if (coverImagePath.startsWith('http://') || coverImagePath.startsWith('https://')) {
      return coverImagePath;
    }
    
    // Build full URL from relative path
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${coverImagePath.startsWith('/') ? coverImagePath : `/${coverImagePath}`}`;
  };

  return {
    // State
    courses,
    currentCourse,
    pagination,
    filters,
    loading,
    error,
    // Methods
    fetchCourses,
    fetchCourse,
    createNewCourse,
    updateCourseData,
    deleteCourseData,
    updateFilters,
    resetFilters,
    clearCourseError,
    clearCourse,
    // Helpers
    prepareCourseFormData,
    getContentTypeLabel,
    groupContentsByType,
    getCoverImageUrl,
  };
};

export default useCourse;

