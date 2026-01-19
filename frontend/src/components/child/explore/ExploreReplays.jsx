import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useExplore } from '../../../hooks/exploreHook';
import { useExploreVideoWatch } from '../../../hooks/exploreVideoWatchHook';
import ExploreReplaysCard from './ExploreReplaysCard';
import VideoPlayerModal from '../common/VideoPlayerModal';

/**
 * ExploreReplays Component
 * 
 * Displays "Watch Replays" section with header and horizontally scrollable cards
 * Fetches replay videos (videoType: 'replay') with limit of 4
 */
const ExploreReplays = ({ childId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { fetchContentByType } = useExplore();
  const { getExploreVideoWatchStatus } = useExploreVideoWatch(childId);

  const [replayContent, setReplayContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedExploreContentId, setSelectedExploreContentId] = useState(null);
  const [videoViewCounts, setVideoViewCounts] = useState({}); // Map of exploreContentId -> viewCount
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!fetchContentByType || hasLoadedRef.current) return;

    const loadReplays = async () => {
      try {
        setLoading(true);
        hasLoadedRef.current = true;
        const result = await fetchContentByType('video', {
          videoType: 'replay',
          limit: 4,
          page: 1,
        });

        // The result structure is { type, response } where response contains { success, data, pagination }
        console.log('ExploreReplays - API Result:', result);

        const contentData = result?.response?.data || result?.data;
        if (contentData && Array.isArray(contentData)) {
          console.log('ExploreReplays - Setting content:', contentData);
          setReplayContent(contentData);
          
          // Fetch per-child view counts for each replay video
          if (childId && getExploreVideoWatchStatus) {
            const viewCountPromises = contentData.map(async (content) => {
              try {
                const status = await getExploreVideoWatchStatus(content._id);
                return {
                  exploreContentId: content._id.toString(),
                  viewCount: status?.currentWatchCount || 0,
                };
              } catch (error) {
                console.error(`Error fetching view count for ${content._id}:`, error);
                return {
                  exploreContentId: content._id.toString(),
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
        } else {
          console.warn('ExploreReplays - No valid data found in result:', result);
        }
      } catch (error) {
        console.error('Error loading replay content:', error);
        hasLoadedRef.current = false; // Allow retry on error
      } finally {
        setLoading(false);
      }
    };

    loadReplays();
  }, [fetchContentByType, childId, getExploreVideoWatchStatus]);

  const handleSeeAll = () => {
    // Navigate to full replays page
    if (childId) {
      navigate(`/child/${childId}/explore/replays`);
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
        setVideoViewCounts((prev) => ({
          ...prev,
          [selectedExploreContentId.toString()]: newViewCount,
        }));
      } catch (error) {
        console.error('Error refreshing view count after video completion:', error);
      }
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('ExploreReplays - State:', { loading, replayContent, contentCount: replayContent?.length });
  }, [loading, replayContent]);

  if (loading) {
    return (
      <Box sx={{ marginBottom: 4 }}>
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif' }}>Loading replays...</Typography>
      </Box>
    );
  }

  if (!replayContent || replayContent.length === 0) {
    console.log('ExploreReplays - No content to display, replayContent:', replayContent);
    return null; // Don't show section if no content
  }

  console.log('ExploreReplays - Rendering with content:', replayContent);

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
              fontSize: '24px',
              fontWeight: 700,
              color: theme.palette.secondary.main,
            }}
          >
            ▶️
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
        {replayContent.map((content) => {
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
