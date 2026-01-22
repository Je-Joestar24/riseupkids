import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildModuleChantCards Component
 * 
 * Individual chant card component for Chants section
 * Similar to audio cards - displays cover image, title, description, and metadata
 */
const ChildModuleChantCards = ({
  chant,
  isCompleted = false,
  onCardClick,
}) => {
  // Get cover image URL
  const getCoverImageUrl = (coverImagePath) => {
    if (!coverImagePath) return null;
    
    // If already a full URL, return as-is
    if (coverImagePath.startsWith('http://') || coverImagePath.startsWith('https://')) {
      return coverImagePath;
    }
    
    // Build full URL from relative path
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${coverImagePath.startsWith('/') ? coverImagePath : `/${coverImagePath}`}`;
  };

  const coverImageUrl = chant?.coverImage ? getCoverImageUrl(chant.coverImage) : null;

  // Get estimated time
  const estimatedTimeMinutes = chant?.estimatedDuration || 0;
  const estimatedTime = estimatedTimeMinutes > 0 ? `${estimatedTimeMinutes} min` : '0 min';

  // Get star points
  const starPoints = chant?.starsAwarded || 0;

  return (
    <Box
      onClick={onCardClick}
      sx={{
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        '&:hover': {
          transform: 'scale(1.05)',
        },
        backgroundColor: themeColors.textInverse,
        borderRadius: '0px',
        overflow: 'hidden',
      }}
    >
      {/* Cover Image Container - Fixed height like audio cards */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '160px',
          overflow: 'hidden',
          backgroundColor: '#f0f0f0',
        }}
      >
        {/* Cover Image */}
        {coverImageUrl && (
          <Box
            component="img"
            src={coverImageUrl}
            alt={chant?.title || 'Chant cover'}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Completion Checkbox - Top Left */}
        {isCompleted && (
          <Box
            sx={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              padding: '8px',
              backgroundColor: themeColors.textInverse,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={themeColors.secondary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
          </Box>
        )}

        {/* Star Badge - Top Right */}
        {starPoints > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: themeColors.accent,
              borderRadius: '9999px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: themeColors.textInverse }}
              aria-hidden="true"
            >
              <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
            </svg>
            <Typography
              sx={{
                fontSize: '16px',
                fontWeight: 600,
                color: themeColors.textInverse,
              }}
            >
              {starPoints}
            </Typography>
          </Box>
        )}

        {/* Estimated Time - Lower Left */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            padding: '6px 12px',
            backgroundColor: 'oklab(0 0 0 / 0.6)',
            borderRadius: '22px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 600,
              color: themeColors.textInverse,
            }}
          >
            {estimatedTime}
          </Typography>
        </Box>
      </Box>

      {/* Content Section - Title and Description */}
      <Box
        sx={{
          padding: '20px',
        }}
      >
        {/* Title */}
        <Typography
          sx={{
            fontSize: '16px',
            fontWeight: 600,
            color: themeColors.text,
            marginBottom: '8px',
            lineHeight: 1.4,
          }}
        >
          {chant?.title || 'Chant'}
        </Typography>

        {/* Description - Show first 60 chars or truncated */}
        {chant?.description && (
          <Typography
            sx={{
              fontSize: '13px',
              fontWeight: 400,
              color: themeColors.textSecondary,
              marginBottom: '12px',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {chant.description}
          </Typography>
        )}

        {/* Footer - Chant label and Star points */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Chant Label */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {/* Musical note icon */}
            <Box
              sx={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: themeColors.secondary,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </Box>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: 500,
                opacity: '0.8',
                color: themeColors.textSecondary,
              }}
            >
              Chant
            </Typography>
          </Box>

        </Box>
      </Box>
    </Box>
  );
};

export default ChildModuleChantCards;
