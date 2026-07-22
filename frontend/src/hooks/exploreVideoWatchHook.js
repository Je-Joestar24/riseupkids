import { useState, useCallback } from 'react';
import exploreVideoWatchService from '../services/exploreVideoWatchService';
import { useDispatch } from 'react-redux';
import { applyStarRewardFromCompletion } from '../utils/childStatsSync';

/**
 * Custom hook for explore video watch management
 * 
 * Provides easy access to explore video watch tracking and star awards
 * 
 * @param {String} childId - Child's ID
 * @returns {Object} Hook methods and state
 */
export const useExploreVideoWatch = (childId) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Mark explore video as watched (completed)
   * Awards stars on first watch (except for replay videos)
   * @param {String} exploreContentId - ExploreContent ID
   * @param {Number} [completionPercentage] - Optional completion percentage (0-100, default: 100)
   * @returns {Promise} Watch result with star award info
   */
  const markExploreVideoWatched = useCallback(async (exploreContentId, completionPercentage = 100) => {
    if (!childId || !exploreContentId) {
      throw new Error('Child ID and Explore Content ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await exploreVideoWatchService.markExploreVideoWatched(
        exploreContentId,
        childId,
        completionPercentage
      );
      
      if (response.success && response.data) {
        const { 
          videoWatch, 
          requiredWatchCount, 
          starsAwarded, 
          starsAwardedAt, 
          starsToAward,
          starsJustAwarded,
          starsWereAlreadyAwarded,
          isReplay,
        } = response.data;
        
        // Update child stats in sessionStorage and Redux
        // This ensures the header updates immediately without page reload
        // Note: Notifications are handled by VideoPlayerModal, not here
        if (starsJustAwarded && !isReplay) {
          applyStarRewardFromCompletion({
            childId,
            starsToAward,
            dispatch,
          });
        }
        
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to record explore video watch');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (err || 'Failed to record explore video watch');
      setError(errorMessage);
      // Don't show notification here - let VideoPlayerModal handle errors
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [childId, dispatch]);

  /**
   * Get explore video watch status for a child
   * @param {String} exploreContentId - ExploreContent ID
   * @returns {Promise} Watch status data
   */
  const getExploreVideoWatchStatus = useCallback(async (exploreContentId) => {
    if (!childId || !exploreContentId) {
      throw new Error('Child ID and Explore Content ID are required');
    }

    try {
      const response = await exploreVideoWatchService.getExploreVideoWatchStatus(exploreContentId, childId);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get explore video watch status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (err || 'Failed to get explore video watch status');
      // Don't show notification for status checks (might be called frequently)
      throw new Error(errorMessage);
    }
  }, [childId]);

  /**
   * Get total stars earned for a specific video type
   * @param {String} videoType - Video type (e.g., 'replay', 'cooking', 'music', etc.)
   * @returns {Promise} Total stars earned for this video type
   */
  const getTotalStarsForVideoType = useCallback(async (videoType) => {
    if (!childId || !videoType) {
      throw new Error('Child ID and Video Type are required');
    }

    try {
      const response = await exploreVideoWatchService.getTotalStarsForVideoType(videoType, childId);
      if (response.success && response.data) {
        return response.data.totalStars || 0;
      } else {
        throw new Error(response.message || 'Failed to get total stars for video type');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (err || 'Failed to get total stars for video type');
      // Don't show notification for status checks (might be called frequently)
      // Return 0 as fallback
      console.error('[ExploreVideoWatch] Error getting total stars:', errorMessage);
      return 0;
    }
  }, [childId]);

  /**
   * Get progress for a specific video type (total videos and viewed videos count)
   * @param {String} videoType - Video type (e.g., 'replay', 'cooking', 'music', etc.)
   * @returns {Promise} Progress data with totalVideos and viewedVideos
   */
  const getVideoTypeProgress = useCallback(async (videoType) => {
    if (!childId || !videoType) {
      throw new Error('Child ID and Video Type are required');
    }

    try {
      const response = await exploreVideoWatchService.getVideoTypeProgress(videoType, childId);
      if (response.success && response.data) {
        return {
          totalVideos: response.data.totalVideos || 0,
          viewedVideos: response.data.viewedVideos || 0,
        };
      } else {
        throw new Error(response.message || 'Failed to get video type progress');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (err || 'Failed to get video type progress');
      // Don't show notification for status checks (might be called frequently)
      // Return default values as fallback
      console.error('[ExploreVideoWatch] Error getting video type progress:', errorMessage);
      return {
        totalVideos: 0,
        viewedVideos: 0,
      };
    }
  }, [childId]);

  return {
    // State
    loading,
    error,
    // Methods
    markExploreVideoWatched,
    getExploreVideoWatchStatus,
    getTotalStarsForVideoType,
    getVideoTypeProgress,
  };
};

export default useExploreVideoWatch;
