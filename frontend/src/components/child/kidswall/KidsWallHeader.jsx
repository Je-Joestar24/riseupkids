import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { phoneFluid } from '../../../constants/childPhoneLayout';
import starsImage from '../../../assets/images/stars.png';

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
        padding: { xs: phoneFluid(16, 24), sm: '24px' },
        border: '4px solid',
        borderColor: themeColors.orange,
        marginBottom: { xs: phoneFluid(20, 32), sm: '32px' },
        backgroundColor: themeColors.bgCard,
        borderRadius: '0px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <Typography
          component="h2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: { xs: phoneFluid(24, 30), sm: '30px' },
            color: themeColors.secondary,
            textAlign: 'center',
            marginBottom: '0px',
          }}
        >
          Show & Tell!
        </Typography>
        <Box
          component="img"
          src={starsImage}
          alt="Stars"
          sx={{
            width: { xs: phoneFluid(36, 48), sm: '48px' },
            height: { xs: phoneFluid(36, 48), sm: '48px' },
            objectFit: 'contain',
          }}
        />
      </Box>
      <Typography
        component="p"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: phoneFluid(16, 20), sm: '20px' },
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
