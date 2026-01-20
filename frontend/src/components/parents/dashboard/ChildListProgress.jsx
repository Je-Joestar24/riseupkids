import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildListProgress Component
 * 
 * Displays list of children with progress information
 * Each child has a "View Child Progress" button
 * Fully mobile responsive
 */
const ChildListProgress = ({ children, loading, onSelectChild, onViewProgress }) => {
  const theme = useTheme();

  if (loading && children.length === 0) {
    return (
      <Card
        sx={{
          borderRadius: { xs: '16px', sm: '20px' },
          backgroundColor: themeColors.bgCard,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <CardContent sx={{ padding: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 3 }}>
            <CircularProgress size={40} sx={{ color: themeColors.secondary }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (children.length === 0) {
    return (
      <Card
        sx={{
          borderRadius: { xs: '16px', sm: '20px' },
          backgroundColor: themeColors.bgCard,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <CardContent sx={{ padding: { xs: 3, sm: 4 } }}>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              color: themeColors.textSecondary,
              textAlign: 'center',
              padding: 3,
            }}
          >
            No children found. Add your first child!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: { xs: '16px', sm: '20px' },
        backgroundColor: themeColors.bgCard,
        border: `1px solid ${themeColors.border}`,
      }}
    >
      <CardContent sx={{ padding: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: { xs: 2, sm: 3 } }}>
          <PeopleIcon
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              color: themeColors.secondary,
            }}
          />
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              fontWeight: 700,
              color: themeColors.secondary,
            }}
          >
            Your Children
          </Typography>
        </Box>

        <Grid container spacing={{ xs: 2, sm: 2, md: 2 }}>
          {children.map((child) => (
            <Grid item xs={12} sm={6} md={4} key={child._id}>
              <Card
                sx={{
                  borderRadius: { xs: '12px', sm: '16px' },
                  backgroundColor: themeColors.bgTertiary,
                  border: `1px solid ${themeColors.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[4],
                  },
                }}
                onClick={() => onSelectChild && onSelectChild(child._id)}
              >
                <CardContent sx={{ padding: { xs: 2, sm: 3 } }}>
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontSize: { xs: '1rem', sm: '1.25rem' },
                      fontWeight: 700,
                      color: themeColors.text,
                      marginBottom: 1,
                    }}
                  >
                    {child.displayName || child.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      color: themeColors.textSecondary,
                      marginBottom: 2,
                    }}
                  >
                    {child.stats?.totalStars || 0} stars earned
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<TrendingUpIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onViewProgress) {
                        onViewProgress(child._id);
                      }
                    }}
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      textTransform: 'none',
                      backgroundColor: themeColors.secondary,
                      color: themeColors.textInverse,
                      borderRadius: { xs: '8px', sm: '12px' },
                      paddingY: { xs: '10px', sm: '12px' },
                      '&:hover': {
                        backgroundColor: themeColors.primary,
                      },
                    }}
                  >
                    View Child Progress
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ChildListProgress;
