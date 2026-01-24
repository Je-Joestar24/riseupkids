import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import audioPlaceholder from '../../../assets/images/audio.png';

/**
 * ChildModuleAudioCards Component
 * 
 * Individual audio assignment card component for Audio section
 * Displays cover image, headphones badge, time, title, and star points
 * Shows child-friendly "Let's Try Again!" message when status is rejected
 */
const ChildModuleAudioCards = ({
  audio,
  status,
  onCardClick,
}) => {
  // Check if status is rejected (child-friendly handling)
  const isRejected = status === 'rejected';
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

  // Use cover image or static placeholder
  const coverImageUrl = audio?.coverImage 
    ? getCoverImageUrl(audio.coverImage) 
    : audioPlaceholder;

  // Get estimated time (audio has estimatedDuration in minutes)
  const estimatedTimeMinutes = audio?.estimatedDuration || 0;
  const estimatedTime = estimatedTimeMinutes > 0 ? `${estimatedTimeMinutes} min` : '0 min';

  // Get star points (audio has starsAwarded field)
  const starPoints = audio?.starsAwarded || 0;

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
        borderRadius: '0px', // Pointy borders (not rounded)
        overflow: 'hidden',
      }}
    >
      {/* Cover Image Container - Height 160px */}
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
        <Box
          component="img"
          src={coverImageUrl}
          alt={audio?.title || 'Audio assignment'}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Headphones Badge - Top Right */}
        <Box
          sx={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '36px',
            height: '36px',
            padding: '8px',
            backgroundColor: themeColors.orange,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Headphones icon - 30px (46px - 16px padding) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={themeColors.textInverse}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path>
          </svg>
        </Box>

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

      {/* Content Section - 20px padding all sides */}
      <Box
        sx={{
          padding: '20px',
        }}
      >
        {/* Title - 16px font size */}
        <Typography
          sx={{
            fontSize: '16px',
            fontWeight: 600,
            color: themeColors.text,
            marginBottom: '12px',
            lineHeight: 1.4,
          }}
        >
          {audio?.title || 'Audio Assignment'}
        </Typography>

        {/* Child-friendly "Let's Try Again!" badge when rejected */}
        {isRejected && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: 'rgba(255, 183, 77, 0.15)',
              borderRadius: '12px',
              marginBottom: '12px',
              border: '2px dashed rgba(255, 152, 0, 0.4)',
            }}
          >
            {/* Friendly star/sparkle icon */}
            <Box
              sx={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: themeColors.orange,
                borderRadius: '50%',
                flexShrink: 0,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="white"
                aria-hidden="true"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </Box>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: 700,
                color: themeColors.orange,
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              Let's Try Again!
            </Typography>
          </Box>
        )}

        {/* Footer - Audio label and Star points */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Audio Label with Headphones Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {/* Headphones icon - same as top badge */}
            <Box
              sx={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: themeColors.orange
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke='white'
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path>
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
              Audio
            </Typography>
          </Box>

          {/* Star Points Badge */}
          {starPoints > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                backgroundColor: 'rgb(244, 237, 216)',
                borderRadius: '16px',
              }}
            >
              {/* Coins icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={themeColors.accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="8" cy="8" r="6"></circle>
                <path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path>
                <path d="M7 6h1v4"></path>
                <path d="m16.71 13.88.7.71-2.82 2.82"></path>
              </svg>
              {/* Static (+) text */}
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: themeColors.accent,
                }}
              >
                +
              </Typography>
              {/* Star points value */}
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: themeColors.accent,
                }}
              >
                {starPoints}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ChildModuleAudioCards;
