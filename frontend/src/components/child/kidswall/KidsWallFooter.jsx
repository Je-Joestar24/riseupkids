import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * KidsWallFooter Component
 * 
 * Footer component for KidsWall page with motivational message
 */
const KidsWallFooter = () => {
  return (
    <Box
      sx={{
        width: '100%',
        marginTop: '32px',
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
      {/* Row 1: Star Icon */}
      <Box
        sx={{
          fontSize: '60px',
          lineHeight: 1,
        }}
      >
        🌟
      </Box>

      {/* Row 2: Main Title */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '30px',
          fontWeight: 700,
          color: themeColors.secondary,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        You're All Amazing!
      </Typography>

      {/* Row 3: Subtitle */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '20px',
          fontWeight: 600,
          color: 'oklch(0.446 0.03 256.802)',
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        Keep learning and sharing!🎉
      </Typography>
    </Box>
  );
};

export default KidsWallFooter;
