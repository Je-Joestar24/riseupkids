import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Button, Paper, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useExplore } from '../../../hooks/exploreHook';
import { useExploreVideoWatch } from '../../../hooks/exploreVideoWatchHook';
import { themeColors } from '../../../config/themeColors';
import ExploreVideosCardsEmpty from './ExploreVidoeCardsEmpty';
import VideoPlayerModal from '../common/VideoPlayerModal';

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
  const { fetchExploreContent, getCoverImageUrl, loading } = useExplore();
  const { getExploreVideoWatchStatus } = useExploreVideoWatch(childId);
  const [videos, setVideos] = useState([]);
  const [videoWatchStatuses, setVideoWatchStatuses] = useState({});
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedExploreContentId, setSelectedExploreContentId] = useState(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const lastLoadedRef = useRef({ childId: null, videoType: null });
  const isLoadingRef = useRef(false);

  // Fetch videos for this video type
  useEffect(() => {
    // Skip if already loading or if same childId and videoType
    if (isLoadingRef.current) return;
    if (lastLoadedRef.current.childId === childId && lastLoadedRef.current.videoType === videoType) return;
    if (!childId || !videoType) return;
    
    const loadVideos = async () => {
      isLoadingRef.current = true;
      lastLoadedRef.current = { childId, videoType };
      
      try {
        setLoadingStatuses(true);
        const result = await fetchExploreContent({
          type: 'video',
          videoType,
          isPublished: true,
        });

        const videoList = result?.data || [];
        setVideos(videoList);

        // Fetch watch statuses for all videos using explore video watch status
        const statusPromises = videoList.map(async (video) => {
          const exploreContentId = video._id;
          if (!exploreContentId) return null;

          try {
            const status = await getExploreVideoWatchStatus(exploreContentId);
            return {
              exploreContentId: exploreContentId.toString(),
              isWatched: status?.starsAwarded || (status?.currentWatchCount || 0) > 0,
              watchCount: status?.currentWatchCount || 0,
              starsAwarded: status?.starsAwarded || false,
            };
          } catch (error) {
            // Video not watched yet or error fetching status
            return {
              exploreContentId: exploreContentId.toString(),
              isWatched: false,
              watchCount: 0,
              starsAwarded: false,
            };
          }
        });

        const statuses = await Promise.all(statusPromises);
        const statusMap = {};
        statuses.forEach((status) => {
          if (status) {
            statusMap[status.exploreContentId] = status;
          }
        });
        setVideoWatchStatuses(statusMap);
      } catch (error) {
        console.error('Error loading videos:', error);
        // Reset last loaded on error so we can retry
        lastLoadedRef.current = { childId: null, videoType: null };
      } finally {
        setLoadingStatuses(false);
        isLoadingRef.current = false;
      }
    };

    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, videoType]); // Only depend on childId and videoType - functions are stable

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
          [exploreContentId.toString()]: {
            exploreContentId: exploreContentId.toString(),
            isWatched: status?.starsAwarded || (status?.currentWatchCount || 0) > 0,
            watchCount: status?.currentWatchCount || 0,
            starsAwarded: status?.starsAwarded || false,
          },
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

  // Get video object for VideoPlayerModal
  const getVideoObjectForPlayer = (exploreVideo) => {
    // Get video URL from videoFile
    const videoFile = exploreVideo?.videoFile;
    let videoUrl = null;
    
    if (videoFile?.url) {
      // If already a full URL, use it
      if (videoFile.url.startsWith('http://') || videoFile.url.startsWith('https://')) {
        videoUrl = videoFile.url;
      } else {
        // Build full URL from relative path
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        videoUrl = `${baseUrl}${videoFile.url.startsWith('/') ? videoFile.url : `/${videoFile.url}`}`;
      }
    } else if (exploreVideo?.videoFileUrl) {
      // Use videoFileUrl from ExploreContent
      if (exploreVideo.videoFileUrl.startsWith('http://') || exploreVideo.videoFileUrl.startsWith('https://')) {
        videoUrl = exploreVideo.videoFileUrl;
      } else {
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        videoUrl = `${baseUrl}${exploreVideo.videoFileUrl.startsWith('/') ? exploreVideo.videoFileUrl : `/${exploreVideo.videoFileUrl}`}`;
      }
    }

    return {
      _id: videoFile?._id || exploreVideo._id,
      title: exploreVideo.title,
      url: videoUrl,
      description: exploreVideo.description,
      duration: exploreVideo.duration,
      // SCORM file if exists
      scormFile: videoFile?.scormFile,
      scormFileUrl: videoFile?.scormFileUrl,
      scormFilePath: videoFile?.scormFilePath,
    };
  };

  // Truncate description to 50 characters
  const truncateDescription = (text) => {
    if (!text) return '';
    if (text.length <= 50) return text;
    return text.substring(0, 50) + '...';
  };

  // Loading state - white card similar to footer
  if (loading || loadingStatuses) {
    return (
      <Paper
        sx={{
          width: '100%',
          padding: '32px',
          backgroundColor: themeColors.bgCard,
          borderRadius: '0px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          minHeight: '200px',
        }}
      >
        <CircularProgress />
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '18px',
            fontWeight: 600,
            color: themeColors.textSecondary,
            textAlign: 'center',
          }}
        >
          Loading videos...
        </Typography>
      </Paper>
    );
  }

  // Empty state
  if (!loading && !loadingStatuses && videos.length === 0) {
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
      {videos.map((video) => {
        const coverImageUrl = getVideoCoverImageUrl(video);
        const duration = getVideoDuration(video);
        const watched = isVideoWatched(video);
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
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '192px',
                backgroundColor: '#f0f0f0',
                overflow: 'hidden',
              }}
            >
              {/* Cover Image */}
              {coverImageUrl && (
                <Box
                  component="img"
                  src={coverImageUrl}
                  alt={video?.title || 'Video thumbnail'}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}

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
            </Box>

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
                {watched ? 'Review Lesson' : 'Start Lesson'}
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
