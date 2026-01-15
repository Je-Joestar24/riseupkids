import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildModuleCards Component
 * 
 * Individual book card component for Library section
 * Displays cover image, completion status, star badge, time, and progress circles
 */
const ChildModuleCards = ({
  book,
  isCompleted = false,
  progressCircles = 0, // Number of circles filled (0-5)
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

  const coverImageUrl = book?.coverImage ? getCoverImageUrl(book.coverImage) : null;

  // Get estimated time (books have estimatedReadingTime, format as "X min")
  const estimatedTimeMinutes = book?.estimatedReadingTime || book?.estimatedTime || book?.duration || 0;
  const estimatedTime = estimatedTimeMinutes > 0 ? `${estimatedTimeMinutes} min` : '0 min';

  // Get star points (books have totalStarsAwarded)
  const starPoints = book?.totalStarsAwarded || book?.starsAwarded || 0;

  return (
    <Box
      onClick={onCardClick}
      sx={{
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        '&:hover': {
          transform: 'scale(1.05)',
        },
        backgroundColor: 'white'
      }}
    >
      {/* Cover Image Container - Perfect Square */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingTop: '100%', // This creates a perfect square (aspect ratio 1:1)
          borderRadius: '0px',
          overflow: 'hidden',
          backgroundColor: '#f0f0f0',
          marginBottom: '0px',
        }}
      >
        {/* Cover Image */}
        {coverImageUrl && (
          <Box
            component="img"
            src={coverImageUrl}
            alt={book?.title || 'Book cover'}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
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
              backgroundColor: themeColors.textInverse, // White background
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Circle-check icon - 20px size */}
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
              backgroundColor: themeColors.accent, // #f2af10
              borderRadius: '9999px', // rounded-full
              padding: '6px 12px', // y 6px, x 12px
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Star icon - filled white */}
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
                color: themeColors.textInverse, // white
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

      {/* Progress Circles - 5 circles */}
      <Box
        sx={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}
      >
        {[0, 1, 2, 3, 4].map((index) => {
          const isFilled = index < progressCircles;
          return (
            <Box
              key={index}
              sx={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: `2px solid ${themeColors.secondary}`,
                backgroundColor: isFilled ? themeColors.secondary : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              {isFilled && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={themeColors.textInverse}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m9 12 2 2 4-4"></path>
                </svg>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ChildModuleCards;
