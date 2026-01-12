import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * KidsWallHeader Component
 * 
 * Header component for KidsWall page
 */
const KidsWallHeader = () => {
  return (
    <Box
      sx={{
        width: '100%',
        padding: '24px',
        border: '4px solid',
        borderColor: themeColors.orange,
        marginBottom: '32px',
        backgroundColor: themeColors.bgCard,
        borderRadius: '0px',
      }}
    >
      <Typography
        component="h2"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '30px',
          color: themeColors.secondary,
          textAlign: 'center',
          marginBottom: '0px',
        }}
      >
        Show & Tell! 🎉
      </Typography>
      <Typography
        component="p"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '20px',
          color: 'oklch(0.551 0.027 264.364)',
          textAlign: 'center',
          fontWeight: 600
        }}
      >
        See what friends are learning!
      </Typography>
    </Box>
  );
};

export default KidsWallHeader;
