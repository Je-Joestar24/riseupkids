import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ExploreFooter Component
 * 
 * Footer component for KidsWall page with motivational message
 */
const ExploreFooter = () => {
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

      {/* Row 2: Main Title */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '24px',
          fontWeight: 700,
          color: themeColors.secondary,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        Coming Soon!
      </Typography>


    </Box>
  );
};

export default ExploreFooter;
