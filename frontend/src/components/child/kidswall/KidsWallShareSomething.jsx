import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { themeColors } from '../../../config/themeColors';
import {
  KIDS_WALL_UPLOAD_DISABLED_BUTTON,
  KIDS_WALL_UPLOAD_DISABLED_SUBTITLE,
} from '../../../constants/kidsWallConsent';

/**
 * KidsWallShareSomething Component
 * 
 * Promotional card component encouraging users to share their work
 */
const KidsWallShareSomething = ({ childId, onSubmit, loading, uploadEnabled = true }) => {
  const navigate = useNavigate();

  const handleShareClick = () => {
    if (!uploadEnabled || !childId) return;
    navigate(`/child/${childId}/wall/share`);
  };

  const subtitle = uploadEnabled
    ? 'Ask a grown-up to help you share!'
    : KIDS_WALL_UPLOAD_DISABLED_SUBTITLE;

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
              color: uploadEnabled ? 'oklch(0.446 0.03 256.802)' : themeColors.textSecondary,
              fontWeight: 600
            }}
          >
            {subtitle}
          </Typography>
        </Box>
      </Box>

      {/* Second Row: Button */}
      <Button
        onClick={handleShareClick}
        disabled={loading || !uploadEnabled}
        fullWidth
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '1.2rem',
          textTransform: 'none',
          padding: '16px 24px',
          borderRadius: '0px',
          backgroundColor: uploadEnabled ? themeColors.orange : themeColors.bgTertiary,
          color: uploadEnabled ? themeColors.textInverse : themeColors.textSecondary,
          border: uploadEnabled ? 'none' : `2px solid ${themeColors.border}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: uploadEnabled ? themeColors.orange : themeColors.bgTertiary,
            opacity: uploadEnabled ? 0.9 : 1,
            transform: uploadEnabled ? 'scale(1.05)' : 'none',
          },
          '&:disabled': {
            backgroundColor: themeColors.bgTertiary,
            color: themeColors.textSecondary,
          },
        }}
      >
        {uploadEnabled ? 'Share Something Cool!' : KIDS_WALL_UPLOAD_DISABLED_BUTTON}
      </Button>
    </Box>
  );
};

export default KidsWallShareSomething;
