import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import ChildModuleVideoCards from './ChildModuleVideoCards';
import useCourseProgress from '../../../hooks/courseProgressHook';

/**
 * ChildModuleVideos Component
 * 
 * Videos section displaying videos from the course in a 3-column grid
 * Shows progress circles based on video watch count
 * 
 * @param {Array} videos - Array of video objects
 * @param {Object} courseProgress - Course progress data
 * @param {Function} onVideoClick - Click handler for videos
 * @param {String} childId - Child's ID
 * @param {Number} refreshTrigger - Optional trigger value to force refresh (increment to refresh)
 */
const ChildModuleVideos = forwardRef(({ videos = [], courseProgress = null, onVideoClick, childId, refreshTrigger = 0 }, ref) => {
  const { getChildVideoWatches } = useCourseProgress(childId);
  const [videoWatches, setVideoWatches] = useState({}); // Map of videoId -> watch status
  const [loadingWatches, setLoadingWatches] = useState(false);

  // Fetch video watch statuses for all videos
  const fetchVideoWatches = async () => {
    if (!childId || !videos || videos.length === 0) {
      setVideoWatches({});
      return;
    }

    setLoadingWatches(true);
    try {
      const watches = await getChildVideoWatches();
      
      // Create a map of videoId -> watch status
      // Handle both string and ObjectId formats
      const watchMap = {};
      if (watches && Array.isArray(watches)) {
        watches.forEach((watch) => {
          if (watch.videoId) {
            // Normalize videoId to string for consistent matching
            const normalizedId = String(watch.videoId);
            watchMap[normalizedId] = watch;
          }
        });
      }
      
      setVideoWatches(watchMap);
    } catch (error) {
      console.error('Error fetching video watches:', error);
      // Don't show error to user, just use empty map
      setVideoWatches({});
    } finally {
      setLoadingWatches(false);
    }
  };

  useEffect(() => {
    fetchVideoWatches();
  }, [childId, videos?.length]); // Only refetch when childId or number of videos changes

  // Refresh watches when courseProgress changes (e.g., after video is watched)
  useEffect(() => {
    if (childId && videos && videos.length > 0) {
      // Small delay to ensure backend has updated
      const timeoutId = setTimeout(() => {
        fetchVideoWatches();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [courseProgress?.progress?.contentProgress?.length]);

  // Refresh when refreshTrigger changes (e.g., after video completes)
  useEffect(() => {
    if (refreshTrigger > 0 && childId && videos && videos.length > 0) {
      // Small delay to ensure backend has updated
      const timeoutId = setTimeout(() => {
        fetchVideoWatches();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [refreshTrigger, childId, videos?.length]);

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refreshWatches: () => {
      if (childId && videos && videos.length > 0) {
        fetchVideoWatches();
      }
    },
  }));

  // Get completed video IDs from progress
  const getCompletedVideos = () => {
    const completedVideos = new Set();
    if (courseProgress?.progress?.contentProgress) {
      courseProgress.progress.contentProgress
        .filter((item) => item.contentType === 'video' && item.status === 'completed')
        .forEach((item) => {
          const key = `${item.contentId.toString()}-${item.contentType}`;
          completedVideos.add(key);
        });
    }
    return completedVideos;
  };

  const completedVideos = getCompletedVideos();

  // Calculate progress circles for each video (0-5) based on watch count
  const getVideoProgress = (video) => {
    // Use _contentId or _id from populated video data
    const videoId = video._contentId || video._id || video.contentId;
    if (!videoId) return 0;
    
    // Normalize videoId to string for consistent matching
    const normalizedId = String(videoId);
    
    // Get watch status for this video
    const watchStatus = videoWatches[normalizedId];
    if (!watchStatus) return 0;
    
    // Get current watch count and required watch count
    const currentWatchCount = watchStatus.currentWatchCount || 0;
    const requiredWatchCount = watchStatus.requiredWatchCount || 5; // Default to 5
    
    // Calculate how many circles to fill (max 5)
    // Each circle represents one watch, but cap at 5 circles
    const progressCircles = Math.min(currentWatchCount, 5);
    
    return progressCircles;
  };

  // Check if video is completed (stars awarded = watched required count)
  const isVideoCompleted = (video) => {
    // Use _contentId or _id from populated video data
    const videoId = video._contentId || video._id || video.contentId;
    if (!videoId) return false;
    
    // Normalize videoId to string for consistent matching
    const normalizedId = String(videoId);
    
    // Check if stars were awarded (means required watch count was reached)
    const watchStatus = videoWatches[normalizedId];
    if (watchStatus && watchStatus.starsAwarded) {
      return true;
    }
    
    // Fallback: check course progress completion
    const key = `${videoId.toString()}-video`;
    return completedVideos.has(key);
  };

  if (!videos || videos.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          marginTop: '32px',
        }}
      >
        <Typography
          sx={{
            fontSize: '20px',
            fontWeight: 600,
            color: themeColors.textSecondary,
            textAlign: 'center',
            padding: '32px',
          }}
        >
          No videos available in this course.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        marginTop: '32px',
      }}
    >
      {/* Section Title */}
      <Typography
        sx={{
          fontSize: '24px',
          fontWeight: 600,
          color: themeColors.textInverse,
          marginBottom: '24px',
        }}
      >
        Videos
      </Typography>

      {/* Videos Grid - 3 columns */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: '24px',
        }}
      >
        {videos.map((video, index) => {
          // Video is already populated with full data from API
          const videoId = video._id || video._contentId || video.contentId || video.id;
          
          // Check if stars are awarded (required watch count reached)
          const normalizedId = videoId ? String(videoId) : null;
          const watchStatus = normalizedId ? videoWatches[normalizedId] : null;
          const starsAwarded = watchStatus?.starsAwarded || false;
          
          return (
            <ChildModuleVideoCards
              key={videoId || index}
              video={video}
              isCompleted={starsAwarded} // Only show completion checkbox when stars are awarded
              progressCircles={getVideoProgress(video)}
              onCardClick={() => {
                if (onVideoClick) {
                  onVideoClick(video);
                }
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
});

ChildModuleVideos.displayName = 'ChildModuleVideos';

export default ChildModuleVideos;
