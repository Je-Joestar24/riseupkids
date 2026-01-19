import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import footerStarImage from '../../../assets/images/footer_star.png';


/**
 * ExploreReplaysFooter Component
 * 
 * Footer component for Explore Videos page with motivational message
 * 
 * @param {String} videoType - Video type (e.g., 'cooking', 'music', etc.)
 */
const ExploreReplaysFooter = () => {
  const footerTitle = "Keep Learning!";
  const footerSubtitle = "Watch as many times as you want!";

  return (
    <Box
      sx={{
        width: '100%',
        padding: '32px',
        backgroundColor: themeColors.bgCard,
        borderRadius: '0px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0px',
      }}
    >
      {/* Row 1: Stars Image */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={footerStarImage}
          alt="Stars"
          style={{
            width: '120px',
            height: '120px',
            objectFit: 'contain',
          }}
        />
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
        {footerTitle}
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
        {footerSubtitle}
      </Typography>
    </Box>
  );
};

export default ExploreReplaysFooter;
