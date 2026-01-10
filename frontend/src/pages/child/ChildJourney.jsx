import React, { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { themeColors } from '../../config/themeColors';
import { useTheme } from '@mui/material/styles';
import useCourseProgress from '../../hooks/courseProgressHook';
import ChildJourneyHeader from '../../components/child/journey/ChildJourneyHeader';
import ChildJourneyCards from '../../components/child/journey/ChildJourneyCards';
import ChildJourneySummary from '../../components/child/journey/ChildJourneySummary';

/**
 * ChildJourney Page
 * 
 * Journey page for child interface
 * Displays course progress in a card grid layout
 */
const ChildJourney = ({ childId }) => {
  const theme = useTheme();
  const {
    courses,
    loading,
    error,
    fetchChildCourses,
    getSummaryCounts,
  } = useCourseProgress(childId);

  // Fetch courses on mount
  useEffect(() => {
    if (childId) {
      fetchChildCourses();
    }
  }, [childId, fetchChildCourses]);

  // Calculate current week and total weeks from courses
  // Uses sequential position (1, 2, 3...) not raw stepOrder values (10, 20, 30...)
  const calculateWeeks = () => {
    if (!courses || courses.length === 0) {
      return { currentWeek: 1, totalWeeks: 36 };
    }

    // Courses are already sorted by stepOrder from backend
    // Find the first course that is in_progress or not_started
    const currentCourseIndex = courses.findIndex(
      c => c.status === 'in_progress' || c.status === 'not_started'
    );

    // If no current course, find the last completed course
    if (currentCourseIndex === -1) {
      // Find last completed course
      let lastCompletedIndex = -1;
      for (let i = courses.length - 1; i >= 0; i--) {
        if (courses[i].status === 'completed') {
          lastCompletedIndex = i;
          break;
        }
      }
      
      if (lastCompletedIndex >= 0) {
        // Next week after last completed
        const currentWeek = lastCompletedIndex + 2; // +1 for index to position, +1 for next
        const totalWeeks = courses.length;
        return { 
          currentWeek: Math.min(currentWeek, totalWeeks), 
          totalWeeks: Math.max(totalWeeks, currentWeek) 
        };
      }
      
      // No completed courses, start from week 1
      return { currentWeek: 1, totalWeeks: courses.length || 36 };
    }

    // Current week is the sequential position (index + 1)
    const currentWeek = currentCourseIndex + 1;
    const totalWeeks = courses.length || 36;

    return { currentWeek, totalWeeks };
  };

  const { currentWeek, totalWeeks } = calculateWeeks();
  const summaryCounts = getSummaryCounts();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: themeColors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '90px',
        }}
      >
        <CircularProgress sx={{ color: themeColors.textInverse }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: themeColors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '90px',
          padding: { xs: '16px', sm: '32px' },
        }}
      >
        <Typography
          sx={{
            color: themeColors.textInverse,
            fontSize: '18px',
            textAlign: 'center',
          }}
        >
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: themeColors.primary, // --theme-primary: #62caca
        paddingBottom: '90px', // Space for fixed bottom navigation
        paddingTop: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Container with 848px max-width */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '848px',
          backgroundColor: 'transparent',
          padding: { xs: '16px', sm: '32px' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Header - Title and Subtitle */}
        <ChildJourneyHeader week={currentWeek} totalWeeks={totalWeeks} />

        {/* Card Grid Area */}
        <ChildJourneyCards courses={courses} />

        {/* Progress Summary */}
        <ChildJourneySummary
          completed={summaryCounts.completed}
          current={summaryCounts.current}
          locked={summaryCounts.locked}
        />
      </Box>
    </Box>
  );
};

export default ChildJourney;
