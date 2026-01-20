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
        {/* First Column: Sparkles Icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            flexShrink: 0,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ color: 'rgb(242, 175, 16)' }}
          >
            <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
            <path d="M20 2v4"></path>
            <path d="M22 4h-4"></path>
            <circle cx="4" cy="20" r="2"></circle>
          </svg>
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
        Share Something Cool!
      </Button>
    </Box>
  );
};

export default KidsWallShareSomething;
