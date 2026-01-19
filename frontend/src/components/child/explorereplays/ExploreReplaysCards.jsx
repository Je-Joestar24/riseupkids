import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Button, Paper, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useExplore } from '../../../hooks/exploreHook';
import { useExploreVideoWatch } from '../../../hooks/exploreVideoWatchHook';
import { themeColors } from '../../../config/themeColors';
import VideoPlayerModal from '../common/VideoPlayerModal';

/**
 * Clock Icon SVG Component
 */
const ClockIcon = ({ size = 12 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 6v6l4 2"></path>
    <circle cx="12" cy="12" r="10"></circle>
  </svg>
);

/**
 * Play Icon SVG Component
 */
const PlayIcon = ({ size = 32, color = '#62caca' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    stroke={themeColors.secondary}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>
  </svg>
);

/**
 * Eye Icon SVG Component
 */
const EyeIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

/**
 * ExploreReplaysCards Component
 * 
 * Displays replay video cards in a 3-column grid
 * Shows cover image, subject badge, duration, play icon, title, creator, views, and Watch Now button
 * 
 * @param {String} childId - Child's ID
 */
const ExploreReplaysCards = ({ childId }) => {
  const theme = useTheme();
  const { fetchExploreContent, getCoverImageUrl, loading } = useExplore();
  const { getExploreVideoWatchStatus } = useExploreVideoWatch(childId);
  const [videos, setVideos] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoViewCounts, setVideoViewCounts] = useState({}); // Map of exploreContentId -> viewCount
  const [selectedExploreContentId, setSelectedExploreContentId] = useState(null);
  const lastLoadedRef = useRef({ childId: null });
  const isLoadingRef = useRef(false);

  // Fetch replay videos
  useEffect(() => {
    // Skip if already loading or if same childId
    if (isLoadingRef.current) return;
    if (lastLoadedRef.current.childId === childId) return;
    if (!childId) return;
    
    const loadVideos = async () => {
      isLoadingRef.current = true;
      lastLoadedRef.current = { childId };
      
      try {
        setLoadingStatuses(true);
        const result = await fetchExploreContent({
          type: 'video',
          videoType: 'replay',
          isPublished: true,
        });

        const videoList = result?.data || [];
        setVideos(videoList);
        
        // Fetch per-child view counts for each replay video
        if (childId && getExploreVideoWatchStatus) {
          const viewCountPromises = videoList.map(async (video) => {
            try {
              const status = await getExploreVideoWatchStatus(video._id);
              return {
                exploreContentId: video._id.toString(),
                viewCount: status?.currentWatchCount || 0,
              };
            } catch (error) {
              console.error(`Error fetching view count for ${video._id}:`, error);
              return {
                exploreContentId: video._id.toString(),
                viewCount: 0,
              };
            }
          });
          
          const viewCounts = await Promise.all(viewCountPromises);
          const viewCountMap = {};
          viewCounts.forEach((item) => {
            viewCountMap[item.exploreContentId] = item.viewCount;
          });
          setVideoViewCounts(viewCountMap);
        }
      } catch (error) {
        console.error('Error loading replay videos:', error);
        // Reset last loaded on error so we can retry
        lastLoadedRef.current = { childId: null };
      } finally {
        setLoadingStatuses(false);
        isLoadingRef.current = false;
      }
    };

    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]); // Only depend on childId - functions are stable

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

  // Format view count
  const formatViewCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Handle video card click
  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setSelectedExploreContentId(video._id);
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
        setVideoViewCounts((prev) => ({
          ...prev,
          [selectedExploreContentId.toString()]: newViewCount,
        }));
      } catch (error) {
        console.error('Error refreshing view count after video completion:', error);
      }
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

  // Loading state
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
          Loading replays...
        </Typography>
      </Paper>
    );
  }

  // Empty state
  if (!loading && !loadingStatuses && videos.length === 0) {
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
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '18px',
            fontWeight: 600,
            color: themeColors.textSecondary,
            textAlign: 'center',
          }}
        >
          No replays available yet.
        </Typography>
      </Paper>
    );
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
        // Get per-child view count (fallback to 0 if not loaded yet)
        const perChildViewCount = videoViewCounts[video._id?.toString()] ?? 0;
        const viewCount = formatViewCount(perChildViewCount);
        const creatorName = video?.createdBy?.name || video?.uploadedBy?.name || '';

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

              {/* Subject Badge - Upper Left (display none if not handled) */}
              {video?.subject && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    padding: '6px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '16px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: themeColors.text,
                      fontFamily: 'Quicksand, sans-serif',
                    }}
                  >
                    {video.subject}
                  </Typography>
                </Box>
              )}

              {/* Duration Badge - Lower Right */}
              {video?.duration && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    backgroundColor: 'oklab(0 0 0 / 0.6)',
                    borderRadius: '22px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      lineHeight: '20px'
                  }}
                >
                  <Box sx={{ color: themeColors.textInverse, margin: 'auto', 
                      lineHeight: '20px' }}>
                    <ClockIcon size={12} />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: themeColors.textInverse,
                      fontFamily: 'Quicksand, sans-serif',
                      lineHeight: '20px'
                    }}
                  >
                    {duration}
                  </Typography>
                </Box>
              )}

              {/* Play Icon - Center */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                <PlayIcon size={32} color={themeColors.secondary} />
              </Box>
            </Box>

            {/* Row 2: Content Details */}
            <Box
              sx={{
                padding: '16px',
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

              {/* Row 2: Creator Name */}
              {creatorName && (
                <Typography
                  sx={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: themeColors.textSecondary,
                    fontFamily: 'Quicksand, sans-serif',
                    lineHeight: 1.4,
                  }}
                >
                  by {creatorName}
                </Typography>
              )}

              {/* Row 3: Footer - Views and Watch Now Button */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {/* Left Column: Views Count */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Box sx={{ color: 'oklch(0.707 0.022 261.325)' }}>
                    <EyeIcon size={16} color="oklch(0.707 0.022 261.325)" />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'oklch(0.707 0.022 261.325)',
                      fontFamily: 'Quicksand, sans-serif',
                    }}
                  >
                    {viewCount} views
                  </Typography>
                </Box>

                {/* Right Column: Watch Now Button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVideoClick(video);
                  }}
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    textTransform: 'none',
                    padding: '8px 16px',
                    borderRadius: '0px',
                    backgroundColor: themeColors.accent,
                    color: themeColors.textInverse,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: themeColors.accent,
                      opacity: 0.9,
                    },
                  }}
                >
                  Watch Now
                </Button>
              </Box>
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
          videoType="replay"
          onVideoComplete={handleVideoComplete}
        />
      )}
    </Box>
  );
};

export default ExploreReplaysCards;
