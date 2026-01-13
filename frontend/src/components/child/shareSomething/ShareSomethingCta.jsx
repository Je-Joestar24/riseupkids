import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * Smiley Face Icon Component (SVG - Outlined)
 */
const SmileyIcon = ({ color = 'currentColor', size = 40 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
    <line x1="9" y1="9" x2="9.01" y2="9"></line>
    <line x1="15" y1="9" x2="15.01" y2="9"></line>
  </svg>
);

/**
 * ShareSomethingCta Component
 * 
 * Call-to-action section for Share Something page
 */
const ShareSomethingCta = ({ photo, title, description, onSubmit, loading }) => {
  // Check if all fields are filled
  // Photo must exist, title must have content after trim, description must have content after trim
  const hasPhoto = Boolean(photo);
  const hasTitle = Boolean(title && typeof title === 'string' && title.trim().length > 0);
  const hasDescription = Boolean(description && typeof description === 'string' && description.trim().length > 0);
  
  const isFormComplete = hasPhoto && hasTitle && hasDescription;
  const isDisabled = !isFormComplete || loading;

  const handleSubmit = () => {
    if (!isDisabled && onSubmit) {
      onSubmit({
        photo,
        title: title?.trim(),
        description: description?.trim(),
      });
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        padding: '24px',
        border: '4px solid',
        borderColor: themeColors.accent,
        borderRadius: '0px',
        backgroundColor: 'white',
        marginBottom: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px',
      }}
    >
      {/* First Row: Title with Icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            flexShrink: 0,
          }}
        >
          <SmileyIcon color={themeColors.accent} size={40} />
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '24px',
              fontWeight: 700,
              color: themeColors.secondary,
              lineHeight: 1.2,
            }}
          >
            Ready to Share?
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '18px',
              fontWeight: 600,
              color: 'oklch(0.551 0.027 264.364)',
              lineHeight: 1.2,
            }}
          >
            Ask a grown-up to help you!
          </Typography>
        </Box>
      </Box>

      {/* Button */}
      <Button
        onClick={handleSubmit}
        disabled={isDisabled}
        fullWidth
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '1.2rem',
          textTransform: 'none',
          padding: '16px 24px',
          borderRadius: '0px',
          transition: 'all 0.3s ease',

          backgroundColor: isDisabled
            ? `${themeColors.secondary}80`
            : themeColors.orange,

          color: isDisabled
            ? 'rgba(107, 114, 128, 0.7)'
            : themeColors.textInverse,

          '&:hover': {
            backgroundColor: isDisabled
              ? `${themeColors.secondary}80`
              : themeColors.orange,
            opacity: isDisabled ? 1 : 0.9,
          },

          '&.Mui-disabled': {
            backgroundColor: `${themeColors.secondary}80`,
            color: 'rgba(107, 114, 128, 0.7)',
          },
        }}
        aria-label={isDisabled ? 'Fill everything out first' : 'Share my work'}
      >
        {isDisabled ? '⬆️ Fill Everything Out First!' : '🎉 Share My Work!'}
      </Button>

    </Box>
  );
};

export default ShareSomethingCta;
