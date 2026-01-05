import React from 'react';
import { Box, Paper, Typography, Stack, Chip, CircularProgress, Grid, Card, CardContent } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Description as DescriptionIcon } from '@mui/icons-material';
import useActivity from '../../../../hooks/activityHook';

/**
 * ActivityItems Component
 * 
 * Displays list of activities
 */
const ActivityItems = ({ loading }) => {
  const theme = useTheme();
  const { activities } = useActivity();


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Paper
        sx={{
          padding: 4,
          textAlign: 'center',
          borderRadius: '12px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
          }}
        >
          No activities found
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            marginTop: 1,
          }}
        >
          Create your first activity to get started
        </Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={2}>
      {activities.map((activity) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={activity._id}>
          <Card
            sx={{
              borderRadius: '12px',
              border: `1px solid ${theme.palette.border.main}`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: theme.shadows[4],
                transform: 'translateY(-4px)',
              },
            }}
          >
            <CardContent sx={{ flexGrow: 1, padding: 2.5 }}>
              <Stack spacing={2}>
                {/* Cover Image or Icon */}
                {activity.coverImage ? (
                  <Box
                    component="img"
                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${activity.coverImage}`}
                    alt={activity.title}
                    sx={{
                      width: '100%',
                      height: 120,
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginBottom: 1,
                    }}
                  />
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
                    <DescriptionIcon sx={{ fontSize: 48, color: theme.palette.orange.main }} />
                  </Box>
                )}

                {/* SCORM Badge */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Chip
                    label="SCORM"
                    size="small"
                    sx={{
                      backgroundColor: `${theme.palette.primary.main}20`,
                      color: theme.palette.primary.main,
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                    }}
                  />
                </Box>

                {/* Title */}
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                    fontSize: '1.125rem',
                    color: theme.palette.text.primary,
                    lineHeight: 1.4,
                  }}
                >
                  {activity.title}
                </Typography>

                {/* Description */}
                {activity.description && (
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: theme.palette.text.secondary,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {activity.description}
                  </Typography>
                )}

                {/* Stars and Status */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    label={`⭐ ${activity.starsAwarded || 15} stars`}
                    size="small"
                    sx={{
                      backgroundColor: theme.palette.orange.light,
                      color: theme.palette.orange.dark,
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label={activity.isPublished ? 'Published' : 'Draft'}
                    size="small"
                    sx={{
                      backgroundColor: activity.isPublished
                        ? theme.palette.success.light
                        : theme.palette.grey[300],
                      color: activity.isPublished
                        ? theme.palette.success.dark
                        : theme.palette.grey[700],
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 500,
                    }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ActivityItems;

