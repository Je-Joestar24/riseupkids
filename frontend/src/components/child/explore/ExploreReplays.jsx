import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useExplore } from '../../../hooks/exploreHook';
import { useExploreVideoWatch } from '../../../hooks/exploreVideoWatchHook';
import { useCachedLoad } from '../../../hooks/useCachedLoad';
import { loadReplayViewCounts } from '../../../utils/replayViewCounts';
import ExploreReplaysCard from './ExploreReplaysCard';
import ExploreReplaysSkeleton from './ExploreReplaysSkeleton';
import { VideoPlayerModal } from '../common/lazyModals';
import useIdlePreload from '../../../hooks/useIdlePreload';
import { buildExploreVideoForPlayer } from '../../../utils/exploreVideoPlayback';
import themeColors from '../../../config/themeColors';

/**
 * ExploreReplays Component
 * 
 * Displays "Watch Replays" section with header and horizontally scrollable cards
 * Fetches replay videos (videoType: 'replay') with limit of 4
 */
const ExploreReplays = ({ childId }) => {
  // The player's code is downloaded in the background, so tapping a video does not wait for it.
  useIdlePreload([VideoPlayerModal]);
  const theme = useTheme();
  const navigate = useNavigate();
  const { fetchContentByType } = useExplore();
  const { getExploreVideoWatchStatus } = useExploreVideoWatch(childId);

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedExploreContentId, setSelectedExploreContentId] = useState(null);

  // The row, with each video's view count for this child, is cached per child: only a first visit
  // shows the placeholder; later visits draw the last answer at once and replace it quietly.
  const { data, loaded, error, setData } = useCachedLoad(
    childId ? `${childId}:explore:replayRow` : null,
    async ({ quiet, previous }) => {
      const result = await fetchContentByType(
        'video',
        { videoType: 'replay', limit: 4, page: 1 },
        { silent: quiet }
      );
      // The result structure is { type, response } where response contains { success, data, pagination }
      const content = result?.response?.data || result?.data;
      if (!Array.isArray(content)) throw new Error('No replay videos found');
      return {
        content,
        viewCounts: await loadReplayViewCounts({
          videos: content,
          childId,
          getStatus: getExploreVideoWatchStatus,
          previousCounts: previous?.viewCounts,
        }),
      };
    }
  );
  const replayContent = data?.content || [];
  const videoViewCounts = data?.viewCounts || {}; // Map of exploreContentId -> viewCount
  const loading = Boolean(childId) && !loaded && !error;

  const handleSeeAll = () => {
    // Navigate to full replays page
    if (childId) {
      navigate(`/child/${childId}/explore/replays`);
    }
  };

  const getVideoObjectForPlayer = (exploreVideo) => buildExploreVideoForPlayer(exploreVideo);

  const handleWatchClick = (content) => {
    // Open video in VideoPlayerModal
    setSelectedVideo(content);
    setSelectedExploreContentId(content._id);
    setVideoModalOpen(true);
  };

  // Handle video modal close
  const handleVideoModalClose = () => {
    setVideoModalOpen(false);
    setSelectedVideo(null);
    setSelectedExploreContentId(null);
  };

  // Handle video complete - refresh view count for the watched video
  const handleVideoComplete = async () => {
    // Replay videos don't award stars, but we need to refresh the view count
    if (selectedExploreContentId && childId && getExploreVideoWatchStatus) {
      try {
        const status = await getExploreVideoWatchStatus(selectedExploreContentId);
        const newViewCount = status?.currentWatchCount || 0;
        
        // Update the view count for this video
        setData((previous) => ({
          ...previous,
          viewCounts: { ...previous?.viewCounts, [selectedExploreContentId.toString()]: newViewCount },
        }));
      } catch (error) {
        console.error('Error refreshing view count after video completion:', error);
      }
    }
  };

  if (loading) {
    return <ExploreReplaysSkeleton />;
  }

  if (!replayContent || replayContent.length === 0) {
    return null; // Don't show section if no content
  }

  return (
    <Box sx={{ marginBottom: 4 }}>
      {/* Header Row: Title and See All Button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 2,
        }}
      >
        {/* Title: ▶️ Watch Replays */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography
            component="span"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '20px',
              fontWeight: 700,
              color: 'white',
              backgroundColor: themeColors.primary,
              paddingX: '16px',
              borderRadius: '4px'
            }}
          >
            ▶
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '24px',
              fontWeight: 700,
              color: theme.palette.secondary.main,
            }}
          >
            Watch Replays
          </Typography>
        </Box>

        {/* See All Button */}
        <Button
          onClick={handleSeeAll}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '18px',
            fontWeight: 700,
            color: theme.palette.orange.main,
            textTransform: 'none',
            padding: 0,
            minWidth: 'auto',
            '&:hover': {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              transform: 'scale(1.05)',
            },
          }}
        >
          See All →
        </Button>
      </Box>

      {/* Cards Row: Horizontal Scroll */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE and Edge
          '&::-webkit-scrollbar': {
            display: 'none', // Chrome, Safari, Opera
          },
          paddingBottom: 1,
        }}
      >
        {replayContent.map((content, index) => {
          // Get per-child view count for this video
          const perChildViewCount = videoViewCounts[content._id?.toString()] ?? 0;
          
          // Create content object with per-child view count
          const contentWithViewCount = {
            ...content,
            viewCount: perChildViewCount, // Override global viewCount with per-child count
          };
          
          return (
            <ExploreReplaysCard
              key={content._id}
              content={contentWithViewCount}
              onWatchClick={handleWatchClick}
              imageIndex={index}
            />
          );
        })}
      </Box>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayerModal
          open={videoModalOpen}
          onClose={handleVideoModalClose}
          video={getVideoObjectForPlayer(selectedVideo)}
          exploreContent={selectedVideo}
          childId={childId}
          isExploreVideo={true}
          exploreContentId={selectedVideo._id}
          videoType="replay"
          onVideoComplete={handleVideoComplete}
        />
      )}
    </Box>
  );
};

export default ExploreReplays;
