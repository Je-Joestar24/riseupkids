import { useState, useCallback } from 'react';
import exploreVideoWatchService from '../services/exploreVideoWatchService';
import { useDispatch } from 'react-redux';
import { updateChildStats } from '../store/slices/userSlice';

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
   * Update child stats in sessionStorage and Redux
   * This ensures the header and other components show updated stars immediately
   * @param {Number} totalStars - New total stars value
   */
  const updateChildStatsInStorage = useCallback((totalStars) => {
    if (!childId || totalStars === undefined || totalStars === null) {
      console.warn('[ExploreVideoWatch] Cannot update child stats: missing childId or totalStars');
      return;
    }

    try {
      console.log(`[ExploreVideoWatch] Updating child stats for ${childId} with totalStars: ${totalStars}`);
      
      // Update childProfiles in sessionStorage
      const childProfilesStr = sessionStorage.getItem('childProfiles');
      if (childProfilesStr) {
        const childProfiles = JSON.parse(childProfilesStr);
        const childIndex = childProfiles.findIndex(
          (child) => child._id === childId || child._id?.toString() === childId.toString()
        );
        
        if (childIndex !== -1) {
          // Update the child's stats
          if (!childProfiles[childIndex].stats) {
            childProfiles[childIndex].stats = {};
          }
          childProfiles[childIndex].stats.totalStars = totalStars;
          
          // Save back to sessionStorage
          sessionStorage.setItem('childProfiles', JSON.stringify(childProfiles));
          console.log(`[ExploreVideoWatch] Updated childProfiles in sessionStorage`);
        }
      }
      
      // Update selectedChild in sessionStorage
      const selectedChildStr = sessionStorage.getItem('selectedChild');
      if (selectedChildStr) {
        const selectedChild = JSON.parse(selectedChildStr);
        if (selectedChild._id === childId || selectedChild._id?.toString() === childId.toString()) {
          if (!selectedChild.stats) {
            selectedChild.stats = {};
          }
          selectedChild.stats.totalStars = totalStars;
          sessionStorage.setItem('selectedChild', JSON.stringify(selectedChild));
          console.log(`[ExploreVideoWatch] Updated selectedChild in sessionStorage`);
        }
      }
      
      // Update Redux store
      dispatch(updateChildStats({
        childId,
        stats: { totalStars },
      }));
      console.log(`[ExploreVideoWatch] Updated Redux store with new totalStars`);
      
      // Dispatch event to notify components (like ChildHeader) to refresh
      window.dispatchEvent(new Event('childStatsUpdated'));
      console.log(`[ExploreVideoWatch] Dispatched childStatsUpdated event`);
    } catch (error) {
      console.error('[ExploreVideoWatch] Error updating child stats in storage:', error);
    }
  }, [childId, dispatch]);

  /**
   * Get current totalStars from sessionStorage
   * @returns {Number} Current totalStars or 0
   */
  const getCurrentTotalStars = useCallback(() => {
    try {
      const childProfiles = JSON.parse(sessionStorage.getItem('childProfiles') || '[]');
      const child = childProfiles.find(c => c._id === childId || c._id?.toString() === childId.toString());
      
      if (child && child.stats) {
        return child.stats.totalStars || 0;
      }
      
      // Fallback: try selectedChild
      const selectedChild = JSON.parse(sessionStorage.getItem('selectedChild') || '{}');
      if (selectedChild.stats) {
        return selectedChild.stats.totalStars || 0;
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  }, [childId]);

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
          // Stars were just awarded - update stats
          const currentTotalStars = getCurrentTotalStars();
          const newTotalStars = currentTotalStars + starsToAward;
          updateChildStatsInStorage(newTotalStars);
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
  }, [childId, dispatch, getCurrentTotalStars, updateChildStatsInStorage]);

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
