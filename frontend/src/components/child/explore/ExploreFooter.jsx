import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { themeColors } from '../../../config/themeColors';

/**
 * Coming Soon Card Data
 */
const comingSoonCards = [
  {
    id: 'games',
    emoji: '🎮',
    label: 'Games',
  },
  {
    id: 'world-explorer',
    emoji: '🌍',
    label: 'World Explorer',
  },
  {
    id: 'sports-fun',
    emoji: '⚽',
    label: 'Sports Fun',
  },
  {
    id: 'how-tos',
    emoji: '📝',
    label: "How to's",
  },
];

/**
 * Coming Soon Card Component
 */
const ComingSoonCard = ({ emoji, label, theme }) => {
  return (
    <Paper
      sx={{
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        padding: '24px',
        borderRadius: '0px',
        border: `2px dashed ${theme.palette.border.secondary}`,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '140px',
      }}
    >
      {/* Lock Icon - Top Right */}
      <Box
        sx={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          fontSize: '24px',
        }}
      >
        🔒
      </Box>

      {/* Row 1: Emoji Icon */}
      <Box
        sx={{
          fontSize: '48px',
          marginBottom: '8px',
          opacity: 0.5,
          filter: 'grayscale(100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {emoji}
      </Box>

      {/* Row 2: Label Text */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '18px',
          fontWeight: 400,
          color: theme.palette.text.secondary,
          textAlign: 'center',
        }}
      >
        {label}
      </Typography>
    </Paper>
  );
};

/**
 * ExploreFooter Component
 * 
 * Footer component for Explore page with "Coming Soon" section
 */
const ExploreFooter = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: '100%',
        marginTop: '32px',
        padding: '32px',
        backgroundColor: themeColors.bgCard,
        borderRadius: '0px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
      }}
    >
      {/* Title */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '24px',
          fontWeight: 700,
          color: themeColors.secondary,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        Coming Soon!
      </Typography>

      {/* 4-Column Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: '16px',
          width: '100%',
          maxWidth: '1200px',
        }}
      >
        {comingSoonCards.map((card) => (
          <ComingSoonCard
            key={card.id}
            emoji={card.emoji}
            label={card.label}
            theme={theme}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ExploreFooter;
