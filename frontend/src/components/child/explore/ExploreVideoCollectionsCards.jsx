import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, LinearProgress, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Star as StarIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { useExplore } from '../../../hooks/exploreHook';
import { EXPLORE_VIDEO_TYPES, VIDEO_TYPE_LABELS } from '../../../constants/exploreVideoTypes';

/**
 * SVG Icons for each video type
 */
const VideoTypeIcons = {
  [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: (
    <svg xmlns="http://www.w3.org/2000/svg" width="65" height="65" viewBox="0 0 24 24" fill="none" stroke="#e98a68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"></path>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
    </svg>
  ),
  [EXPLORE_VIDEO_TYPES.COOKING]: (
    <svg xmlns="http://www.w3.org/2000/svg" width="65" height="65" viewBox="0 0 24 24" fill="none" stroke="#f2af10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"></path>
      <path d="M6 17h12"></path>
    </svg>
  ),
  [EXPLORE_VIDEO_TYPES.MUSIC]: (
    <svg xmlns="http://www.w3.org/2000/svg" width="65" height="65" viewBox="0 0 24 24" fill="none" stroke="#62caca" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13"></path>
      <path d="m9 9 12-2"></path>
      <circle cx="6" cy="18" r="3"></circle>
      <circle cx="18" cy="16" r="3"></circle>
    </svg>
  ),
  [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: (
    <svg xmlns="http://www.w3.org/2000/svg" width="65" height="65" viewBox="0 0 24 24" fill="none" stroke="#85c2b9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
    </svg>
  ),
  [EXPLORE_VIDEO_TYPES.STORY_TIME]: (
    <svg xmlns="http://www.w3.org/2000/svg" width="65" height="65" viewBox="0 0 24 24" fill="none" stroke="#e98a68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 7v14"></path>
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
    </svg>
  ),
  [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: (
    <svg xmlns="http://www.w3.org/2000/svg" width="65" height="65" viewBox="0 0 24 24" fill="none" stroke="#62caca" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m11 17 2 2a1 1 0 1 0 3-3"></path>
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"></path>
      <path d="m21 3 1 11h-2"></path>
      <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"></path>
      <path d="M3 4h8"></path>
    </svg>
  ),
};

/**
 * Video Collection Card Component
 */
const VideoCollectionCard = ({ videoType, data, theme, onContinueClick }) => {
  const { totalStars, totalVideos, viewedVideos, hasStarted } = data;
  const progress = totalVideos > 0 ? (viewedVideos / totalVideos) * 100 : 0;
  const label = VIDEO_TYPE_LABELS[videoType] || videoType;
  const icon = VideoTypeIcons[videoType];

  return (
    <Paper
      sx={{
        borderRadius: '0px',
        padding: '24px',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[2],
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: theme.shadows[4],
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Row 1: Icon and Stars */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <StarIcon
            sx={{
              width: 20,
              height: 20,
              color: theme.palette.accent.main,
            }}
          />
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '18px',
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {totalStars}
          </Typography>
        </Box>
      </Box>

      {/* Row 2: Title */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '24px',
          fontWeight: 600,
          color: theme.palette.secondary.main,
          marginBottom: 2,
        }}
      >
        {label}
      </Typography>

      {/* Row 3: Progress */}
      <Box sx={{ marginBottom: 2, flex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 1,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '14px',
              color: 'oklch(0.551 0.027 264.364)',
              fontWeight: 700
            }}
          >
            Progress
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: 'oklch(0.446 0.03 256.802)',
            }}
          >
            {viewedVideos}/{totalVideos}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.palette.custom.bgTertiary,
            '& .MuiLinearProgress-bar': {
              backgroundColor: theme.palette.secondary.main,
              borderRadius: 4,
            },
          }}
        />
      </Box>

      {/* Row 4: Continue/Start Button */}
      <Button
        onClick={() => onContinueClick(videoType)}
        variant="contained"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '20px',
          fontWeight: 600,
          paddingY: '14px',
          borderRadius: '0px',
          backgroundColor: theme.palette.accent.main,
          color: theme.palette.textCustom.inverse,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: theme.palette.accent.dark,
          },
        }}
      >
        {hasStarted ? '▶️ Continue!' : '▶️ Start now!'}
      </Button>
    </Paper>
  );
};

/**
 * Explore Video Collections Cards Component
 * 
 * Displays cards for each video type (excluding replay) in a 3-column grid
 * Shows total stars, progress, and continue/start button for each collection
 */
const ExploreVideoCollectionsCards = ({ onVideoTypeClick }) => {
  const theme = useTheme();
  const { fetchExploreContent } = useExplore();
  const [collectionsData, setCollectionsData] = useState({});
  const [loading, setLoading] = useState(true);

  // Video types to display (excluding replay)
  const videoTypes = [
    EXPLORE_VIDEO_TYPES.ARTS_CRAFTS,
    EXPLORE_VIDEO_TYPES.COOKING,
    EXPLORE_VIDEO_TYPES.MUSIC,
    EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS,
    EXPLORE_VIDEO_TYPES.STORY_TIME,
    EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE,
  ];

  useEffect(() => {
    const loadCollectionsData = async () => {
      try {
        setLoading(true);
        const dataPromises = videoTypes.map(async (videoType) => {
          try {
            const result = await fetchExploreContent({
              type: 'video',
              videoType,
              isPublished: true,
            });
            
            const content = result?.data || [];
            
            // Calculate totals
            const totalVideos = content.length;
            const totalStars = content.reduce((sum, item) => sum + (item.starsAwarded || 10), 0);
            
            // TODO: Calculate viewed videos based on user progress
            // For now, we'll use a placeholder - this should be fetched from user progress API
            const viewedVideos = 0; // Placeholder - needs to be calculated from user progress
            const hasStarted = viewedVideos > 0;
            
            return {
              videoType,
              totalStars,
              totalVideos,
              viewedVideos,
              hasStarted,
            };
          } catch (error) {
            console.error(`Error loading data for ${videoType}:`, error);
            return {
              videoType,
              totalStars: 0,
              totalVideos: 0,
              viewedVideos: 0,
              hasStarted: false,
            };
          }
        });

        const results = await Promise.all(dataPromises);
        const dataMap = {};
        results.forEach((result) => {
          dataMap[result.videoType] = result;
        });
        
        setCollectionsData(dataMap);
      } catch (error) {
        console.error('Error loading collections data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCollectionsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinueClick = (videoType) => {
    if (onVideoTypeClick) {
      onVideoTypeClick(videoType);
    } else {
      // Default behavior: navigate or filter by video type
      console.log('Navigate to video type:', videoType);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
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
        gap: 3,
        marginTop: '30px'
      }}
    >
      {videoTypes.map((videoType) => {
        const data = collectionsData[videoType] || {
          totalStars: 0,
          totalVideos: 0,
          viewedVideos: 0,
          hasStarted: false,
        };

        return (
          <VideoCollectionCard
            key={videoType}
            videoType={videoType}
            data={data}
            theme={theme}
            onContinueClick={handleContinueClick}
          />
        );
      })}
    </Box>
  );
};

export default ExploreVideoCollectionsCards;
