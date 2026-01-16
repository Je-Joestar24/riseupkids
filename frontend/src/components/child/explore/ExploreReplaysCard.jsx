import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { useExplore } from '../../../hooks/exploreHook';

/**
 * ExploreReplaysCard Component
 * 
 * Card component for displaying replay videos in the Explore page
 * Shows cover photo, play icon, duration, title, creator, views, and Watch Now button
 */
const ExploreReplaysCard = ({ content, onWatchClick }) => {
  const theme = useTheme();
  const { getCoverImageUrl, getVideoFileUrl } = useExplore();

  const coverImageUrl = content.coverImage ? getCoverImageUrl(content.coverImage) : null;
  const videoFileUrl = content.videoFileUrl || (content.videoFile?.url ? getVideoFileUrl(content.videoFile.url) : null);

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const formatViewCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleWatchClick = () => {
    if (onWatchClick) {
      onWatchClick(content);
    } else if (videoFileUrl) {
      // Default behavior: open video in new tab or handle navigation
      window.open(videoFileUrl, '_blank');
    }
  };

  return (
    <Box
      sx={{
        width: '288px',
        flexShrink: 0,
        backgroundColor: 'white',
        borderRadius: '0px',
        overflow: 'hidden',
        boxShadow: theme.shadows[2],
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        '&:hover': {
          transform: 'scale(1.03)', // slightly bigger
          boxShadow: theme.shadows[6], // optional: stronger shadow
        },
      }}
    >
      {/* Row 1: Cover Photo with Play Icon and Time Badge */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '160px',
          backgroundColor: theme.palette.custom.bgSecondary,
          overflow: 'hidden',
        }}
      >
        {coverImageUrl ? (
          <Box
            component="img"
            src={coverImageUrl}
            alt={content.title}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.palette.custom.bgSecondary,
            }}
          >
            <PlayArrowIcon
              sx={{
                fontSize: 48,
                color: theme.palette.secondary.main,
              }}
            />
          </Box>
        )}

        {/* Play Icon Overlay - Centered */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="svg"
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill={theme.palette.secondary.main}
            sx={{
              marginLeft: '3px', // Slight offset for visual centering of play triangle
            }}
          >
            <path d="M8 5v14l11-7z" />
          </Box>
        </Box>

        {/* Time Badge - Bottom Right */}
        {content.duration && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              paddingX: '12px',
              paddingY: '4px',
              borderRadius: '12px',
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {formatDuration(content.duration)}
          </Box>
        )}
      </Box>

      {/* Row 2: Content Details Container (20px padding all sides) */}
      <Box
        sx={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          flexGrow: 1,
        }}
      >
        {/* 1st Row: Title */}
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            color: theme.palette.secondary.main,
            lineHeight: 1.2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {content.title}
        </Typography>

        {/* 2nd Row: Creator */}
        {content.createdBy?.name && (
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: '#6b7280', // oklch(0.551 0.027 264.364) - muted purple-grey
            }}
          >
            by {content.createdBy.name}
          </Typography>
        )}

        {/* 3rd Row: Footer - Views and Watch Now Button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
            paddingTop: 1,
          }}
        >
          {/* Left Column: Views Count */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8" // oklch(0.707 0.022 261.325) - light blue-purple
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>
            </svg>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '14px',
                color: '#94a3b8', // oklch(0.707 0.022 261.325) - light blue-purple
              }}
            >
              {formatViewCount(content.viewCount || 0)} views
            </Typography>
          </Box>

          {/* Right Column: Watch Now Button */}
          <Button
            onClick={handleWatchClick}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: 'white',
              backgroundColor: theme.palette.accent.main,
              paddingY: '8px',
              paddingX: '20px',
              borderRadius: '0px',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: theme.palette.accent.dark,
              },
            }}
          >
            Watch Now
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ExploreReplaysCard;
