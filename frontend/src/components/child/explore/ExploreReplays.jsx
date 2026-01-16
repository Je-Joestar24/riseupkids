import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useExplore } from '../../../hooks/exploreHook';
import ExploreReplaysCard from './ExploreReplaysCard';

/**
 * ExploreReplays Component
 * 
 * Displays "Watch Replays" section with header and horizontally scrollable cards
 * Fetches replay videos (videoType: 'replay') with limit of 4
 */
const ExploreReplays = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { fetchContentByType } = useExplore();

  const [replayContent, setReplayContent] = useState([]);
  const [loading, setLoading] = useState(true);
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
  }, [fetchContentByType]);

  const handleSeeAll = () => {
    // Navigate to full explore page with replay filter
    navigate('/child/explore?videoType=replay');
  };

  const handleWatchClick = (content) => {
    // Handle video playback - can navigate to video player or open modal
    if (content.videoFileUrl || content.videoFile?.url) {
      // TODO: Implement video player navigation
      console.log('Watch video:', content);
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
              textDecoration: 'underline',
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
        {replayContent.map((content) => (
          <ExploreReplaysCard
            key={content._id}
            content={content}
            onWatchClick={handleWatchClick}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ExploreReplays;
