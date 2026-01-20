import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import StarIcon from '@mui/icons-material/Star';
import { themeColors } from '../../../config/themeColors';

/**
 * TotalChildStars Component
 * 
 * Displays total stars earned across all children
 * Fully mobile responsive
 */
const TotalChildStars = ({ totalStars, loading }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        borderRadius: { xs: '16px', sm: '20px' },
        backgroundColor: themeColors.bgCard,
        border: `1px solid ${themeColors.border}`,
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent sx={{ padding: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, marginBottom: 2 }}>
          <StarIcon
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem' },
              color: themeColors.accent,
            }}
          />
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 700,
              color: themeColors.text,
            }}
          >
            Total Stars
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            fontWeight: 700,
            color: themeColors.accent,
          }}
        >
          {loading ? '...' : totalStars}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            color: themeColors.textSecondary,
          }}
        >
          Across all children
        </Typography>
      </CardContent>
    </Card>
  );
};

export default TotalChildStars;
