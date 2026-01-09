import React from 'react';
import { AppBar, Box, Toolbar, IconButton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import StarIcon from '@mui/icons-material/Star';
import CloudIcon from '@mui/icons-material/Cloud';
import smallLogo from '../../assets/images/small-logo.png';
import { themeColors } from '../../config/themeColors';

/**
 * ChildHeader Component
 * 
 * Sticky header for child interface
 * Shows logo centered and points/star button on the right
 */
const ChildHeader = () => {
  const theme = useTheme();

  // Get points from sessionStorage or default
  const getPoints = () => {
    try {
      const childProfile = JSON.parse(sessionStorage.getItem('selectedChild') || '{}');
      return childProfile.points || 245; // Default to 245 if not available
    } catch (error) {
      return 245;
    }
  };

  const points = getPoints();

  const handlePointsClick = () => {
    // TODO: Implement points view functionality
    console.log('Points clicked');
  };

  const handleCloudClick = () => {
    // TODO: Implement cloud/sync functionality
    console.log('Cloud clicked');
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        borderRadius: '0px',
        minHeight: '140px',
        display: 'flex'
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight:'140px',
          padding: { xs: '0 16px', sm: '0 24px' },
          maxWidth: '1080px',
          margin: 'auto',
          width: '100%',
        }}
      >
        {/* Logo - Centered */}
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={smallLogo}
            alt="Rise Up Kids Logo"
            style={{
              height: '110px',
              objectFit: 'contain',
            }}
          />
        </Box>

        {/* Right Side Buttons */}
        <Box
          sx={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {/* Points/Star Button */}
          <IconButton
            onClick={handlePointsClick}
            sx={{
              backgroundColor: themeColors.orange, // #e98a68
              color: 'white',
              padding: '16px 32px',
              borderRadius: '0px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              '&:hover': {
                backgroundColor: '#d66b47',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.3s ease',
            }}
            aria-label="Points"
          >
            ⭐
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: '24px',
                textTransform: 'none',
                color: 'white',
              }}
            >
              {points}
            </Typography>
          </IconButton>

          {/* Cloud Button (Optional - can be hidden if not needed) */}
          <IconButton
            onClick={handleCloudClick}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: themeColors.textInverse,
              padding: '8px',
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.3s ease',
            }}
            aria-label="Sync"
          >
            <CloudIcon sx={{ fontSize: '1.25rem' }} />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default ChildHeader;
