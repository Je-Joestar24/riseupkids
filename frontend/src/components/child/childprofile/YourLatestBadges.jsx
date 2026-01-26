import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { getBadgeIcon } from '../../../constants/badgeIcons';

/**
 * YourLatestBadges Component
 * 
 * Displays latest badges earned in a list format
 * Shows badge icon, name, time ago, and stars earned
 */
const YourLatestBadges = ({ latestBadges = [] }) => {
  // Helper function to format time ago
  const getTimeAgo = (badge) => {
    // If badge has createdAt, calculate time ago
    if (badge.createdAt) {
      const now = new Date();
      const badgeDate = new Date(badge.createdAt);
      const diffInHours = Math.floor((now - badgeDate) / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
      } else if (diffInDays === 1) {
        return 'Yesterday';
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
      } else {
        return `${Math.floor(diffInDays / 7)} weeks ago`;
      }
    }
    // Fallback: show placeholder based on index (most recent = "Today", etc.)
    return 'Recently';
  };

  // Helper function to estimate stars earned based on badge
  const getStarsEarned = (badge) => {
    // Estimate stars based on badge rarity and category
    const rarityStars = {
      common: 10,
      uncommon: 25,
      rare: 50,
      epic: 100,
      legendary: 250,
    };

    const categoryMultiplier = {
      level: 1,
      milestone: 1.5,
      streak: 2,
      completion: 1.2,
    };

    const baseStars = rarityStars[badge.rarity] || 10;
    const multiplier = categoryMultiplier[badge.category] || 1;
    return Math.round(baseStars * multiplier);
  };

  if (latestBadges.length === 0) {
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
            fontSize: { xs: '20px', sm: '24px' },
            fontWeight: 700,
            color: themeColors.secondary,
            marginBottom: { xs: '16px', sm: '20px' },
          }}
        >
          Your Latest Wins!
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '14px', sm: '16px' },
            fontWeight: 600,
            color: themeColors.textSecondary,
            textAlign: 'center',
          }}
        >
          No badges earned yet. Keep learning to earn your first badge! 🌟
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
      {/* Title with Lightning Icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: themeColors.accent }}
          aria-hidden="true"
        >
          <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
        </svg>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '20px', sm: '24px' },
            fontWeight: 700,
            color: themeColors.secondary,
          }}
        >
          Your Latest Wins!
        </Typography>
      </Box>

      {/* Badge List */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {latestBadges.map((badge, index) => {
          const icon = getBadgeIcon(badge);
          const timeAgo = getTimeAgo(badge);
          const starsEarned = getStarsEarned(badge);

          return (
            <Box
              key={badge._id?.toString() || badge.id?.toString() || index}
              sx={{
                backgroundColor: '#fef9e7',
                borderRadius: '16px',
                padding: { xs: '12px', sm: '16px' },
                display: 'flex',
                alignItems: 'center',
                gap: { xs: '12px', sm: '16px' },
              }}
            >
              {/* Badge Icon */}
              <Box
                sx={{
                  fontSize: { xs: '32px', sm: '40px' },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {icon}
              </Box>

              {/* Badge Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: { xs: '16px', sm: '20px' },
                    fontWeight: 600,
                    color: themeColors.secondary,
                    marginBottom: '4px',
                    lineHeight: 1.2,
                  }}
                >
                  Unlocked {badge.name}!
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: { xs: '12px', sm: '14px' },
                    fontWeight: 500,
                    color: themeColors.textSecondary,
                    lineHeight: 1.2,
                  }}
                >
                  {timeAgo}
                </Typography>
              </Box>

              {/* Stars Earned */}
              <Box
                sx={{
                  marginLeft: 'auto',
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: { xs: '18px', sm: '20px' },
                    fontWeight: 700,
                    color: themeColors.accent,
                    whiteSpace: 'nowrap',
                  }}
                >
                  +{starsEarned}⭐
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default YourLatestBadges;
