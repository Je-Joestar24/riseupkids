import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildModuleHeader Component
 * 
 * Header for course detail page with cover image, back button, and step badge
 * Displays cover image (848px × 256px) with floating overlay elements
 */
const ChildModuleHeader = ({ stepNumber, onBack, coverImageUrl, courseTitle }) => {
  return (
    <>
      {/* Cover Image with Overlay Elements */}
      {coverImageUrl && (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: '848px',
            height: '256px',
            marginTop: '20px',
            borderRadius: '0px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Cover Image */}
          <Box
            component="img"
            src={coverImageUrl}
            alt={courseTitle || 'Course cover'}
            sx={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'cover',
            }}
          />

          {/* Back Button - Floating on upper left */}
          <IconButton
            onClick={onBack}
            sx={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              backgroundColor: themeColors.textInverse,
              color: themeColors.secondary, // Secondary color for arrow
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              padding: '12px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              '&:hover': {
                backgroundColor: themeColors.bgSecondary,
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s',
              zIndex: 1,
            }}
            aria-label="Go back to journey"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </IconButton>

          {/* Step Badge - Floating on bottom left */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: themeColors.accent, // Accent background
              border: `4px solid ${themeColors.textInverse}`, // 4px white border
              borderRadius: '20px', // Rounded corners
              padding: '8px 16px', // y-axis 8px, x-axis 16px
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              zIndex: 1,
            }}
          >
            {/* Box icon on the left */}
            <Box
              sx={{
                width: '16px',
                height: '16px',
                backgroundColor: themeColors.textInverse,
                borderRadius: '0px',
                marginRight: '8px',
              }}
            />
            {/* Step text */}
            <Typography
              sx={{
                fontSize: '16px',
                fontWeight: 600,
                color: themeColors.textInverse, // White text
              }}
            >
              Step {stepNumber}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Fallback if no cover image */}
      {!coverImageUrl && (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: '848px',
            height: '256px',
            marginTop: '20px',
            backgroundColor: '#000000',
            borderRadius: '0px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Back Button - Floating on upper left */}
          <IconButton
            onClick={onBack}
            sx={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              backgroundColor: themeColors.textInverse,
              color: themeColors.secondary,
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              padding: '12px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              '&:hover': {
                backgroundColor: themeColors.bgSecondary,
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s',
              zIndex: 1,
            }}
            aria-label="Go back to journey"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </IconButton>

          {/* Step Badge - Floating on bottom left */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: themeColors.accent,
              border: `4px solid ${themeColors.textInverse}`,
              borderRadius: '20px',
              padding: '8px 16px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              zIndex: 1,
            }}
          >
            {/* Box icon on the left */}
            <Box
              sx={{
                width: '16px',
                height: '16px',
                backgroundColor: themeColors.textInverse,
                borderRadius: '0px',
                marginRight: '8px',
              }}
            />
            {/* Step text */}
            <Typography
              sx={{
                fontSize: '16px',
                fontWeight: 600,
                color: themeColors.textInverse,
              }}
            >
              Step {stepNumber}
            </Typography>
          </Box>
        </Box>
      )}
    </>
  );
};

export default ChildModuleHeader;
