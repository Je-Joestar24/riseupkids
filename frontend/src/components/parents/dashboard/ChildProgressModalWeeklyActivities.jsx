import React from 'react';
import { Box, Typography, Card, CardContent, LinearProgress } from '@mui/material';
import BookIcon from '@mui/icons-material/Book';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildProgressModalWeeklyActivities Component
 * 
 * Displays weekly activity progress for courses
 * Shows course name, progress bar, and completion ratio
 */
const ChildProgressModalWeeklyActivities = ({ courses }) => {
  const getProgressColor = (index) => {
    const colors = [
      themeColors.success, // Green
      themeColors.secondary, // Teal/Blue
      themeColors.orange, // Orange
      themeColors.accent, // Yellow
    ];
    return colors[index % colors.length];
  };

  return (
    <Card
      sx={{
        borderRadius: { xs: '12px', sm: '16px' },
        backgroundColor: themeColors.bgCard,
        border: `1px solid ${themeColors.border}`,
      }}
    >
      <CardContent sx={{ padding: { xs: 2, sm: 3 } }}>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '1rem', sm: '1.25rem' },
            fontWeight: 700,
            color: themeColors.secondary,
            marginBottom: 2,
          }}
        >
          This Week's Activity
        </Typography>

        {courses && courses.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {courses.map((course, index) => (
              <Box key={course._id || index}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      fontWeight: 600,
                      color: themeColors.text,
                    }}
                  >
                    {course.title || 'Untitled Course'}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      fontWeight: 600,
                      color: themeColors.textSecondary,
                    }}
                  >
                    {course.completedCount || 0}/{course.totalCount || 0}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={course.progressPercentage || 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: themeColors.bgTertiary,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getProgressColor(index),
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: { xs: 3, sm: 4 },
              textAlign: 'center',
            }}
          >
            <BookIcon
              sx={{
                fontSize: { xs: 40, sm: 48 },
                color: themeColors.textSecondary,
                marginBottom: 1,
                opacity: 0.5,
              }}
            />
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 600,
                color: themeColors.textSecondary,
              }}
            >
              No activity yet
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                color: themeColors.textSecondary,
                marginTop: 0.5,
              }}
            >
              Course progress will appear here once your child begins their learning journey
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ChildProgressModalWeeklyActivities;
