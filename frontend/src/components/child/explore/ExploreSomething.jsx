import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ExploreSomething Component
 * 
 * Footer component for KidsWall page with motivational message
 */
const ExploreSomething = () => {
  return (
    <Box
      sx={{
        width: '100%',
        marginTop: '32px',
        padding: '32px',
        border: '4px solid',
        backgroundColor: themeColors.bgCard,
        borderColor: themeColors.orange,
        borderRadius: '0px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}
    >

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
        What Do You Want to Learn?
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
        Pick Something fun!
      </Typography>
    </Box>
  );
};

export default ExploreSomething;
