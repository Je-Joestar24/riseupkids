import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * HeaderStats Component
 * 
 * Displays child profile with avatar, name, level, and stats
 * Two main rows:
 * 1. Profile avatar + child name and level
 * 2. Total stars, streak, and badges
 */
const HeaderStats = ({ child, stats }) => {
  if (!child || !stats) {
    return null;
  }

  const childName = child.displayName || 'Child';
  const levelName = stats.level || 'New Learner';
  const totalStars = stats.totalStars || 0;
  const streak = stats.currentStreak || 0;
  const totalBadges = stats.totalBadges || 0;

  // Calculate level number based on level name
  const getLevelNumber = () => {
    const levelMap = {
      'New Learner': 0,
      'First Star': 1,
      'Getting Started': 2,
      'Star Beginner': 3,
      'Rising Star': 4,
      'Super Learner': 5,
      'Star Collector': 6,
      'Diamond Level': 7,
      'Champion': 8,
      'Mega Star': 9,
    };
    return levelMap[levelName] || 0;
  };

  const levelNumber = getLevelNumber();

  return (
    <Paper
      sx={{
        padding: { xs: '20px', sm: '24px' },
        backgroundColor: 'white',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '24px',
      }}
    >
      {/* First Row: Profile Avatar + Name & Level */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: '16px', sm: '24px' },
          marginBottom: { xs: '20px', sm: '24px' },
        }}
      >
        {/* Column 1: Profile Avatar with Rocket */}
        <Box
          sx={{
            width: '80px',
            height: '80px',
            background: `linear-gradient(to bottom right, ${themeColors.secondary}, ${themeColors.primary})`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              fontSize: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Rocket profile icon"
          >
            🚀
          </Box>
        </Box>

        {/* Column 2: Name and Level Info */}
        <Box sx={{ flex: 1 }}>
          {/* Row 1: Child Name + Level Name */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '30px',
              fontWeight: 600,
              color: themeColors.secondary,
              marginBottom: '4px',
              lineHeight: 1.2,
            }}
          >
            {childName} the {levelName}!
          </Typography>

          {/* Row 2: Level Number and Title */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '18px', sm: '20px' },
              fontWeight: 500,
              color: themeColors.textSecondary,
              lineHeight: 1.2,
            }}
          >
            Level {levelNumber} {levelName}
          </Typography>
        </Box>
      </Box>

      {/* Second Row: Stats Grid (3 columns) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: { xs: '12px', sm: '16px' },
        }}
      >
        {/* Total Stars */}
        <Box
          sx={{
            backgroundColor: '#fef9e7',
            borderRadius: '16px',
            padding: { xs: '12px', sm: '16px' },
            textAlign: 'center',
          }}
        >
          {/* Star Icon */}
          <Box
            sx={{
              fontSize: { xs: '32px', sm: '40px' },
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: themeColors.accent }}
              aria-hidden="true"
            >
              <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
            </svg>
          </Box>

          {/* Number */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '24px', sm: '30px' },
              fontWeight: 700,
              color: themeColors.orange, // rgb(242, 175, 16)
              marginBottom: '4px',
            }}
          >
            {totalStars}
          </Typography>

          {/* Label */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '12px', sm: '14px' },
              fontWeight: 600,
              color: themeColors.textSecondary,
            }}
          >
            Total Stars
          </Typography>
        </Box>

        {/* Streak */}
        <Box
          sx={{
            backgroundColor: '#fef9e7',
            borderRadius: '16px',
            padding: { xs: '12px', sm: '16px' },
            textAlign: 'center',
          }}
        >
          {/* Fire Icon */}
          <Box
            sx={{
              fontSize: { xs: '32px', sm: '40px' },
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: themeColors.accent }}
              aria-hidden="true"
            >
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
          </Box>

          {/* Number */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '24px', sm: '30px' },
              fontWeight: 700,
              color: themeColors.orange,
              marginBottom: '4px',
            }}
          >
            {streak} {streak === 1 ? 'Day' : 'Days'}
          </Typography>

          {/* Label */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '12px', sm: '14px' },
              fontWeight: 600,
              color: themeColors.textSecondary,
            }}
          >
            Streak
          </Typography>
        </Box>

        {/* Badges */}
        <Box
          sx={{
            backgroundColor: '#fef9e7',
            borderRadius: '16px',
            padding: { xs: '12px', sm: '16px' },
            textAlign: 'center',
          }}
        >
          {/* Trophy Icon */}
          <Box
            sx={{
              fontSize: { xs: '32px', sm: '40px' },
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: themeColors.accent }}
              aria-hidden="true"
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
              <path d="M4 22h16"></path>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
            </svg>
          </Box>

          {/* Number */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '24px', sm: '30px' },
              fontWeight: 700,
              color: themeColors.orange,
              marginBottom: '4px',
            }}
          >
            {totalBadges}
          </Typography>

          {/* Label */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '12px', sm: '14px' },
              fontWeight: 600,
              color: themeColors.textSecondary,
            }}
          >
            Badges
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default HeaderStats;
