import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { themeColors } from '../../../config/themeColors';

/**
 * KidsWallShareSomething Component
 * 
 * Promotional card component encouraging users to share their work
 */
const KidsWallShareSomething = ({ childId, onSubmit, loading }) => {
  const navigate = useNavigate();

  // Handle button click - navigate to share page
  const handleShareClick = () => {
    if (childId) {
      navigate(`/child/${childId}/wall/share`);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: themeColors.bgCard,
        padding: '24px',
        border: '4px solid',
        borderColor: themeColors.secondary,
        borderRadius: '0px',
        marginBottom: '32px',
      }}
    >
      {/* First Row: Icon and Text */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* First Column: Emoji */}
        <Box
          sx={{
            fontSize: '48px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ✨
        </Box>

        {/* Second Column: Title and Subtitle */}
        <Box sx={{ flex: 1 }}>
          {/* Title */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: '24px',
              color: themeColors.secondary,
              marginBottom: '4px',
            }}
          >
            Share Your Amazing Work!
          </Typography>
          {/* Subtitle */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '18px',
              color: 'oklch(0.446 0.03 256.802)',
              fontWeight: 600
            }}
          >
            Ask a grown-up to help you share!
          </Typography>
        </Box>
      </Box>

      {/* Second Row: Button */}
      <Button
        onClick={handleShareClick}
        disabled={loading}
        fullWidth
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '1.2rem',
          textTransform: 'none',
          padding: '16px 24px',
          borderRadius: '0px',
          backgroundColor: themeColors.orange,
          color: themeColors.textInverse,
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: themeColors.orange,
            opacity: 0.9,
            transform: 'scale(1.05)',
          },
          '&:disabled': {
            backgroundColor: themeColors.bgTertiary,
            color: themeColors.textSecondary,
          },
        }}
      >
        📸 Share Something Cool!
      </Button>
    </Box>
  );
};

export default KidsWallShareSomething;
