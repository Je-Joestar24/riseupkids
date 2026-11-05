import React, { useCallback, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { themeColors } from '../../config/themeColors';
import useCourseProgress from '../../hooks/courseProgressHook';
import ChildJourneyHeader from '../../components/child/journey/ChildJourneyHeader';
import ChildJourneyCards from '../../components/child/journey/ChildJourneyCards';
import ChildJourneySummary from '../../components/child/journey/ChildJourneySummary';
import ChildJourneyCardsSkeleton from '../../components/child/journey/ChildJourneyCardsSkeleton';
import ChildLoadError from '../../components/child/common/ChildLoadError';
import { JOURNEY_REFRESH_MIN_AGE_MS } from '../../store/slices/childJourneySlice';
import { CHILD_PAGE_NAV_CLEARANCE } from '../../constants/childNavigationLayout';
import { PHONE_PAGE_SIDE_PADDING } from '../../constants/childPhoneLayout';

/**
 * ChildJourney Page
 * 
 * Journey page for child interface
 * Displays course progress in a card grid layout
 */
const ChildJourney = ({ childId }) => {
  const {
    courses,
    loaded,
    error,
    fetchChildCourses,
    getSummaryCounts,
  } = useCourseProgress(childId);

  // The error screen waits for this page's own first answer: a failure recorded earlier by a
  // background load (Home starts one) must not flash before the page has asked for itself.
  const [answered, setAnswered] = useState(false);

  // A failed refresh leaves the list on screen; only a first load with nothing to show reaches the error screen.
  const refresh = useCallback(
    (options) =>
      fetchChildCourses(options)
        .catch(() => {})
        .finally(() => setAnswered(true)),
    [fetchChildCourses]
  );

  // Fetch courses on mount; the cached list (if any) is shown meanwhile.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-check when returning to the tab (admin lock/unlock), quietly and not more than every 30 s.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        refresh({ minAgeMs: JOURNEY_REFRESH_MIN_AGE_MS });
      }
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

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

  if (error && !loaded && answered) {
    return <ChildLoadError message={error} onRetry={() => refresh()} inverse background={themeColors.primary} />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: themeColors.primary, // --theme-primary: #62caca
        paddingBottom: CHILD_PAGE_NAV_CLEARANCE,
        // phones: the margin all round comes from the container below, so little is needed up here
        paddingTop: { xs: '4px', sm: '40px' },
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
          padding: { xs: PHONE_PAGE_SIDE_PADDING, sm: '32px' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Header - Title stays; the step holds its place until the courses arrive */}
        <ChildJourneyHeader week={currentWeek} totalWeeks={totalWeeks} loading={!loaded} />

        {/* Card Grid Area */}
        {loaded ? <ChildJourneyCards courses={courses} /> : <ChildJourneyCardsSkeleton />}

        {/* Progress Summary - labels stay; the counts hold their place */}
        <ChildJourneySummary
          completed={summaryCounts.completed}
          current={summaryCounts.current}
          locked={summaryCounts.locked}
          loading={!loaded}
        />
      </Box>
    </Box>
  );
};

export default ChildJourney;
