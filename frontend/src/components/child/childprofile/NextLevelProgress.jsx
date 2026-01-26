import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * NextLevelProgress Component
 * 
 * Displays progress to next level with:
 * 1. Title row with sparkles icon and "Next Level: [Name]"
 * 2. Progress bar with percentage
 * 3. Encouragement message
 */
const NextLevelProgress = ({ stats }) => {
  if (!stats) {
    return null;
  }

  const currentLevel = stats.level || 'New Learner';
  const nextLevel = stats.nextLevel;
  const starsNeeded = stats.starsNeededForNextLevel || 0;
  const totalStars = stats.totalStars || 0;

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!nextLevel || starsNeeded === 0) {
      return 100; // Max level reached
    }

    // Get current level threshold and next level threshold
    const levelThresholds = [
      { level: 'First Star', stars: 1 },
      { level: 'Getting Started', stars: 10 },
      { level: 'Star Beginner', stars: 25 },
      { level: 'Rising Star', stars: 50 },
      { level: 'Super Learner', stars: 100 },
      { level: 'Star Collector', stars: 250 },
      { level: 'Diamond Level', stars: 500 },
      { level: 'Champion', stars: 1000 },
      { level: 'Mega Star', stars: 2500 },
    ];

    const currentIndex = levelThresholds.findIndex((l) => l.level === currentLevel);
    if (currentIndex === -1 || currentIndex === levelThresholds.length - 1) {
      return 100;
    }

    const currentThreshold = levelThresholds[currentIndex].stars;
    const nextThreshold = levelThresholds[currentIndex + 1].stars;
    const progress = ((totalStars - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

    return Math.min(100, Math.max(0, Math.round(progress)));
  };

  const progressPercentage = getProgressPercentage();

  if (!nextLevel) {
    return (
      <Paper
        sx={{
          padding: { xs: '20px', sm: '24px' },
          backgroundColor: 'white',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          borderRadius: '24px',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '18px',
            fontWeight: 600,
            color: themeColors.success,
            textAlign: 'center',
          }}
        >
          🎉 You've reached the maximum level! Amazing work!
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        padding: { xs: '20px', sm: '24px' },
        backgroundColor: 'white',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '24px',
      }}
    >
      {/* First Row: Title with Sparkles Icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* Column 1: Sparkles SVG Icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: themeColors.secondary }}
            aria-hidden="true"
          >
            <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
            <path d="M20 2v4"></path>
            <path d="M22 4h-4"></path>
            <circle cx="4" cy="20" r="2"></circle>
          </svg>
        </Box>

        {/* Column 2: Next Level Title */}
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '24px',
            fontWeight: 600,
            color: themeColors.secondary,
            lineHeight: 1.2,
          }}
        >
          Next Level: {nextLevel}!
        </Typography>
      </Box>

      {/* Second Row: Progress Bar with Percentage */}
      <Box
        sx={{
          backgroundColor: themeColors.bgTertiary, // gray-100
          borderRadius: '9999px', // rounded-full
          height: '16px',
          overflow: 'hidden',
          marginBottom: '8px',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            height: '100%',
            borderRadius: '9999px',
            backgroundColor: themeColors.primary, // rgb(98, 202, 202)
            width: `${progressPercentage}%`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '12px',
            transition: 'width 0.3s ease',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: 'white',
            }}
          >
            {progressPercentage}%
          </Typography>
        </Box>
      </Box>

      {/* Third Row: Encouragement Message */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '18px',
          fontWeight: 600,
          color: themeColors.textSecondary,
          lineHeight: 1.2,
        }}
      >
        Need {starsNeeded} more stars! You can do it! 💪
      </Typography>
    </Paper>
  );
};

export default NextLevelProgress;
