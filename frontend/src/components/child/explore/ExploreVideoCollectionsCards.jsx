import React, { useEffect } from 'react';
import { Box, Typography, Button, Paper, LinearProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Star as StarIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { useExplore } from '../../../hooks/exploreHook';
import { useExploreVideoWatch } from '../../../hooks/exploreVideoWatchHook';
import { useCachedLoad } from '../../../hooks/useCachedLoad';
import { EXPLORE_VIDEO_TYPES, VIDEO_TYPE_LABELS } from '../../../constants/exploreVideoTypes';
import { InlineBone } from '../common/ChildSkeleton';
import { phoneFluid } from '../../../constants/childPhoneLayout';

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
 * The icon, title and labels never change, so they are always shown; while `loading`, the stars,
 * the viewed count and the button's wording hold their place until this collection's data arrives.
 */
const VideoCollectionCard = ({ videoType, data, loading, theme, onContinueClick }) => {
  const { totalStars, totalVideos, viewedVideos, hasStarted } = data;
  const progress = totalVideos > 0 ? (viewedVideos / totalVideos) * 100 : 0;
  const label = VIDEO_TYPE_LABELS[videoType] || videoType;
  const icon = VideoTypeIcons[videoType];

  return (
    <Paper
      aria-busy={loading}
      sx={{
        borderRadius: '0px',
        padding: { xs: phoneFluid(16, 24), sm: '24px' },
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[2],
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: theme.shadows[4],
          transform: { xs: 'none', sm: 'translateY(-2px)' },
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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            // phones: the picture shrinks a little on small screens (65px on computers and tablets)
            '& svg': { width: { xs: phoneFluid(48, 65), sm: '65px' }, height: { xs: phoneFluid(48, 65), sm: '65px' } },
          }}
        >
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
              fontSize: { xs: phoneFluid(16, 18), sm: '18px' },
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {loading ? <InlineBone width="28px" /> : totalStars}
          </Typography>
        </Box>
      </Box>

      {/* Row 2: Title */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: phoneFluid(20, 24), sm: '24px' },
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
            {loading ? <InlineBone width="36px" /> : `${viewedVideos}/${totalVideos}`}
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
          fontSize: { xs: phoneFluid(17, 20), sm: '20px' },
          fontWeight: 600,
          paddingY: { xs: phoneFluid(11, 14), sm: '14px' },
          borderRadius: '0px',
          backgroundColor: theme.palette.accent.main,
          color: theme.palette.textCustom.inverse,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: theme.palette.accent.dark,
          },
        }}
      >
        {loading ? <InlineBone width="96px" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }} /> : hasStarted ? 'Continue!' : 'Start now!'}
      </Button>
    </Paper>
  );
};

// Video types to display (excluding replay)
const VIDEO_TYPES = [
  EXPLORE_VIDEO_TYPES.ARTS_CRAFTS,
  EXPLORE_VIDEO_TYPES.COOKING,
  EXPLORE_VIDEO_TYPES.MUSIC,
  EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS,
  EXPLORE_VIDEO_TYPES.STORY_TIME,
  EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE,
];

const EMPTY_COLLECTION = { totalStars: 0, totalVideos: 0, viewedVideos: 0, hasStarted: false };

/**
 * One collection card. Its numbers are cached per child: only a first visit shows placeholders;
 * after that the last numbers are drawn at once and replaced when the refresh arrives.
 */
const CollectionCard = ({ childId, videoType, load, theme, onContinueClick }) => {
  const { data, loaded, error, refresh } = useCachedLoad(
    childId ? `${childId}:explore:collection:${videoType}` : null,
    load
  );

  // Refresh the numbers when a video is watched
  useEffect(() => {
    if (!childId) return undefined;
    const onStatsUpdated = () => {
      refresh().catch(() => {});
    };
    window.addEventListener('childStatsUpdated', onStatsUpdated);
    return () => {
      window.removeEventListener('childStatsUpdated', onStatsUpdated);
    };
  }, [childId, refresh]);

  return (
    <VideoCollectionCard
      videoType={videoType}
      data={data || EMPTY_COLLECTION}
      loading={Boolean(childId) && !loaded && !error}
      theme={theme}
      onContinueClick={onContinueClick}
    />
  );
};

/**
 * Explore Video Collections Cards Component
 *
 * Displays cards for each video type (excluding replay) in a 3-column grid
 * Shows total stars, progress, and continue/start button for each collection
 *
 * @param {Function} onVideoTypeClick - Callback when a video type card is clicked
 * @param {String} childId - Child's ID for fetching progress
 */
const ExploreVideoCollectionsCards = ({ onVideoTypeClick, childId }) => {
  const theme = useTheme();
  const { fetchExploreContent } = useExplore();
  const { getVideoTypeProgress, getTotalStarsForVideoType } = useExploreVideoWatch(childId);

  // One collection: its list, progress and stars are asked for together, not one after another.
  // The progress and the stars must really have arrived: when they cannot, the numbers already on
  // screen stay instead of being replaced by zeros (and a first visit shows zeros, uncached).
  const loadCollection = async (videoType) => {
    const [content, progress, totalStars] = await Promise.all([
      fetchExploreContent({ type: 'video', videoType, isPublished: true }, { silent: true })
        .then((result) => result?.data || [])
        .catch(() => null),
      getVideoTypeProgress(videoType, { strict: true }),
      getTotalStarsForVideoType(videoType, { strict: true }),
    ]);
    const viewedVideos = progress.viewedVideos || 0;
    return {
      videoType,
      totalStars,
      // Use the list's length when the progress service does not know the total
      totalVideos: progress.totalVideos || content?.length || 0,
      viewedVideos,
      hasStarted: viewedVideos > 0,
    };
  };

  const handleContinueClick = (videoType) => {
    if (onVideoTypeClick) {
      onVideoTypeClick(videoType);
    } else {
      // Default behavior: navigate or filter by video type
      console.log('Navigate to video type:', videoType);
    }
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
        },
        gap: { xs: phoneFluid(14, 24), sm: 3 },
        marginTop: '30px'
      }}
    >
      {VIDEO_TYPES.map((videoType) => (
        <CollectionCard
          key={videoType}
          childId={childId}
          videoType={videoType}
          load={() => loadCollection(videoType)}
          theme={theme}
          onContinueClick={handleContinueClick}
        />
      ))}
    </Box>
  );
};

export default ExploreVideoCollectionsCards;
