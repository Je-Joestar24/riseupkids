import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import ChildModuleVideoCards from './ChildModuleVideoCards';

/**
 * ChildModuleVideos Component
 * 
 * Videos section displaying videos from the course in a 3-column grid
 */
const ChildModuleVideos = ({ videos = [], courseProgress = null, onVideoClick }) => {
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

  // Calculate progress circles for each video (0-5)
  // For now, this is static - not based on backend data since "5 times watch" feature is not implemented yet
  const getVideoProgress = (video) => {
    // Use _contentId or _id from populated video data
    const videoId = video._contentId || video._id || video.contentId;
    if (!videoId) return 0;
    
    // For now, if completed, show all 5 circles filled
    // In the future, this can be based on watch count (e.g., watched 3 times = 3 circles)
    const key = `${videoId.toString()}-video`;
    if (completedVideos.has(key)) {
      return 5; // All circles filled if completed
    }
    
    // Static: For now, return 0 (no progress circles filled)
    // When "5 times watch" feature is implemented, this can be:
    // const watchCount = video.watchCount || 0;
    // return Math.min(watchCount, 5);
    return 0;
  };

  // Check if video is completed
  const isVideoCompleted = (video) => {
    // Use _contentId or _id from populated video data
    const videoId = video._contentId || video._id || video.contentId;
    if (!videoId) return false;
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
          
          return (
            <ChildModuleVideoCards
              key={videoId || index}
              video={video}
              isCompleted={isVideoCompleted(video)}
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
};

export default ChildModuleVideos;
