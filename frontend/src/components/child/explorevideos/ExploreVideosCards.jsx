import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useExplore } from '../../../hooks/exploreHook';
import { useExploreVideoWatch } from '../../../hooks/exploreVideoWatchHook';
import { themeColors } from '../../../config/themeColors';
import ExploreVideosCardsEmpty from './ExploreVidoeCardsEmpty';
import ExploreVideosCardsSkeleton from './ExploreVideosCardsSkeleton';
import ChildLoadError from '../common/ChildLoadError';
import { useCachedLoad } from '../../../hooks/useCachedLoad';
import { InlineBone } from '../common/ChildSkeleton';
import VideoPlayerModal from '../common/VideoPlayerModal';
import ExploreCoverImage from '../explore/ExploreCoverImage';
import { buildExploreVideoForPlayer } from '../../../utils/exploreVideoPlayback';

const toWatchStatus = (exploreContentId, status) => ({
  exploreContentId: exploreContentId.toString(),
  isWatched: status?.starsAwarded || (status?.currentWatchCount || 0) > 0,
  watchCount: status?.currentWatchCount || 0,
  starsAwarded: status?.starsAwarded || false,
});

const NO_STATUSES = {};

/**
 * ExploreVideosCards Component
 * 
 * Displays video cards in a 3-column grid for a specific video type
 * Shows cover image, completion status, duration, title, description, and action button
 * 
 * @param {String} childId - Child's ID
 * @param {String} videoType - Video type (e.g., 'cooking', 'music', etc.)
 */
const ExploreVideosCards = ({ childId, videoType }) => {
  const theme = useTheme();
  const { fetchExploreContent, getCoverImageUrl } = useExplore();
  const { getExploreVideoWatchStatus } = useExploreVideoWatch(childId);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedExploreContentId, setSelectedExploreContentId] = useState(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // The list and each video's watched state are cached per child and video type: only a first visit
  // shows placeholders; later visits draw the last answer at once and replace it when it arrives.
  const listCache = useCachedLoad(
    childId && videoType ? `${childId}:explore:videos:${videoType}` : null,
    async ({ quiet }) => {
      const result = await fetchExploreContent(
        { type: 'video', videoType, isPublished: true },
        { silent: quiet }
      );
      return result?.data || [];
    }
  );
  // null until the list has loaded, so the empty message never shows before then
  const videos = listCache.loaded ? listCache.data : null;
  const loadError = listCache.error;

  // Watched state per video, filled in card by card; a card without an entry is still waiting
  const watchedCache = useCachedLoad(
    childId && videoType ? `${childId}:explore:watched:${videoType}` : null,
    null,
    { enabled: false }
  );
  const videoWatchStatuses = watchedCache.data || NO_STATUSES;
  const setVideoWatchStatuses = (updater) =>
    watchedCache.setData((current) => updater(current || NO_STATUSES));

  // Watch status for every video, asked for together; each card updates when its own answer comes.
  // A video is asked about once per visit: a refreshed list only adds the videos that are new.
  const videoIds = videos ? videos.map((video) => video._id).filter(Boolean).join(',') : '';
  const askedRef = useRef({ scope: null, ids: new Set() });
  useEffect(() => {
    if (!videoIds) return;
    const scope = `${childId}:${videoType}`;
    if (askedRef.current.scope !== scope) askedRef.current = { scope, ids: new Set() };
    const asked = askedRef.current.ids;
    videoIds.split(',').filter((id) => !asked.has(id)).forEach(async (id) => {
      asked.add(id);
      let status = null;
      let failed = false;
      try {
        status = await getExploreVideoWatchStatus(id);
      } catch (error) {
        // Not watched yet or error fetching status: treated as not watched
        failed = true;
      }
      // A status that cannot be read again leaves the one already on screen
      setVideoWatchStatuses((previous) =>
        failed && previous[id] ? previous : { ...previous, [id]: toWatchStatus(id, status) }
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoIds, childId, videoType]);

  // Get cover image URL
  const getVideoCoverImageUrl = (video) => {
    const coverImagePath = video?.coverImage;
    if (!coverImagePath) return null;
    return getCoverImageUrl(coverImagePath);
  };

  // Get video duration in minutes
  const getVideoDuration = (video) => {
    const durationSeconds = video?.duration || 0;
    const durationMinutes = Math.ceil(durationSeconds / 60);
    return durationMinutes > 0 ? `${durationMinutes} min` : '0 min';
  };

  // Check if video is watched
  const isVideoWatched = (video) => {
    const exploreContentId = video?._id;
    if (!exploreContentId) return false;
    return videoWatchStatuses[exploreContentId?.toString()]?.isWatched || false;
  };

  // A video whose watch status has not arrived yet (it has no id to wait for otherwise)
  const isWatchStatusPending = (video) =>
    Boolean(video?._id) && videoWatchStatuses[video._id.toString()] === undefined;

  // Handle video card click
  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setSelectedExploreContentId(video._id); // Store exploreContentId separately
    setVideoModalOpen(true);
  };

  // Handle video modal close
  const handleVideoModalClose = () => {
    setVideoModalOpen(false);
    setSelectedVideo(null);
    setSelectedExploreContentId(null);
  };

  // Handle video complete - refresh watch statuses by calling API
  const handleVideoComplete = async (video) => {
    // Use stored exploreContentId to refresh watch status
    const exploreContentId = selectedExploreContentId;
    
    if (exploreContentId) {
      try {
        console.log('[ExploreVideosCards] Refreshing watch status for exploreContentId:', exploreContentId);
        
        // Call API to get updated watch status
        const status = await getExploreVideoWatchStatus(exploreContentId);
        
        console.log('[ExploreVideosCards] Updated watch status:', status);
        
        // Update the watch status in state - this will trigger re-render and update button
        setVideoWatchStatuses((prev) => ({
          ...prev,
          [exploreContentId.toString()]: toWatchStatus(exploreContentId, status),
        }));
        
        console.log('[ExploreVideosCards] Watch status updated, button should now show "Review Lesson"');
      } catch (error) {
        console.error('[ExploreVideosCards] Error refreshing video watch status:', error);
        // Even on error, try to update state optimistically if we know the video was watched
        // This ensures the UI updates even if API call fails
        setVideoWatchStatuses((prev) => ({
          ...prev,
          [exploreContentId.toString()]: {
            exploreContentId: exploreContentId.toString(),
            isWatched: true,
            watchCount: (prev[exploreContentId.toString()]?.watchCount || 0) + 1,
            starsAwarded: videoType !== 'replay' ? true : false, // Only award stars for non-replay videos
          },
        }));
      }
    } else {
      console.warn('[ExploreVideosCards] No exploreContentId available to refresh watch status');
    }
  };

  const getVideoObjectForPlayer = (exploreVideo) => buildExploreVideoForPlayer(exploreVideo);

  // Truncate description to 50 characters
  const truncateDescription = (text) => {
    if (!text) return '';
    if (text.length <= 50) return text;
    return text.substring(0, 50) + '...';
  };

  // First load: the grid of placeholders (the page, header and share card above stay put)
  if (videos === null && !loadError) {
    return <ExploreVideosCardsSkeleton />;
  }

  if (loadError) {
    return (
      <Paper sx={{ width: '100%', backgroundColor: themeColors.bgCard, borderRadius: '0px' }}>
        <ChildLoadError compact message={loadError} onRetry={() => listCache.refresh().catch(() => {})} />
      </Paper>
    );
  }

  // Empty state
  if (videos.length === 0) {
    return <ExploreVideosCardsEmpty videoType={videoType} />;
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
        },
        gap: '20px',
        width: '100%',
      }}
    >
      {videos.map((video, index) => {
        const coverImageUrl = getVideoCoverImageUrl(video);
        const duration = getVideoDuration(video);
        const watched = isVideoWatched(video);
        const statusPending = isWatchStatusPending(video);
        const description = truncateDescription(video?.description || '');

        return (
          <Paper
            key={video._id}
            sx={{
              borderRadius: '0px',
              overflow: 'hidden',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.02)',
              },
            }}
            onClick={() => handleVideoClick(video)}
          >
            {/* Row 1: Cover Image */}
            <ExploreCoverImage
              src={coverImageUrl}
              alt={video?.title || 'Video thumbnail'}
              index={index}
            >
              {/* Completion Check Icon - Top Right */}
              {watched && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '8px',
                    backgroundColor: themeColors.textInverse,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={themeColors.secondary}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                </Box>
              )}

              {/* Duration Badge - Lower Left */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  padding: '6px 12px',
                  backgroundColor: 'oklab(0 0 0 / 0.6)',
                  borderRadius: '22px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: themeColors.textInverse,
                    fontFamily: 'Quicksand, sans-serif',
                  }}
                >
                  {duration}
                </Typography>
              </Box>
            </ExploreCoverImage>

            {/* Row 2: Details */}
            <Box
              sx={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Row 1: Title */}
              <Typography
                sx={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: themeColors.secondary,
                  fontFamily: 'Quicksand, sans-serif',
                  lineHeight: 1.2,
                }}
              >
                {video?.title || 'Untitled Video'}
              </Typography>

              {/* Row 2: Description */}
              {description && (
                <Typography
                  sx={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: themeColors.textSecondary,
                    fontFamily: 'Quicksand, sans-serif',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {description}
                </Typography>
              )}

              {/* Row 3: Button */}
              <Button
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  handleVideoClick(video);
                }}
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: '16px',
                  fontWeight: 600,
                  textTransform: 'none',
                  padding: '12px 0px',
                  borderRadius: '0px',
                  backgroundColor: watched ? themeColors.secondary : themeColors.accent,
                  color: themeColors.textInverse,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: watched ? themeColors.secondary : themeColors.accent,
                    opacity: 0.9,
                  },
                }}
              >
                {statusPending ? <InlineBone width="110px" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }} /> : watched ? 'Review Lesson' : 'Start Lesson'}
              </Button>
            </Box>
          </Paper>
        );
      })}

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
          videoType={videoType}
          onVideoComplete={handleVideoComplete}
        />
      )}
    </Box>
  );
};

export default ExploreVideosCards;
