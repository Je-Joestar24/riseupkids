import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ExploreVideosCardsEmpty Component
 * 
 * Empty state component displayed when there are no videos available
 * 
 * @param {String} videoType - Video type (optional, for customizing message)
 */
const ExploreVideosCardsEmpty = ({ videoType }) => {
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
      }}
    >
      {/* Icon/Emoji */}
      <Box
        sx={{
          fontSize: '60px',
          lineHeight: 1,
        }}
      >
        📹
      </Box>

      {/* Title */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '24px',
          fontWeight: 600,
          color: themeColors.secondary,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        No Videos Available Yet
      </Typography>

      {/* Subtitle */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '18px',
          fontWeight: 600,
          color: 'oklch(0.446 0.03 256.802)',
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        Check back soon for new videos! 🎬
      </Typography>
    </Paper>
  );
};

export default ExploreVideosCardsEmpty;
