import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useDispatch } from 'react-redux';
import ChildHomeStartLearning from '../../components/child/home/ChildHomeStartLearning';
import ChildHomeLiveClass from '../../components/child/home/ChildHomeLiveClass';
import ChildHomeAccumlatedAwards from '../../components/child/home/ChildHomeAccumlatedAwards';
import childrenService from '../../services/childrenService';
import { useCachedLoad } from '../../hooks/useCachedLoad';
import { prefetchChildJourney } from '../../store/slices/childJourneySlice';
import { CHILD_PAGE_NAV_CLEARANCE } from '../../constants/childNavigationLayout';

/**
 * ChildHome Page
 * 
 * Home page for child interface
 * Displays welcome message and child-specific content
 * 
 * Fetches child data directly from API to ensure fresh data,
 * especially for newly created children
 */
const ChildHome = ({ childId }) => {
  const dispatch = useDispatch();

  // The child record is cached per child: only a first visit shows the placeholders; later visits
  // draw the last counts at once and replace them when the refresh arrives.
  const { data, loaded, error, refresh } = useCachedLoad(
    childId ? `${childId}:home:child` : null,
    async () => {
      try {
        const response = await childrenService.getChildById(childId);
        return response.data || response;
      } catch (err) {
        console.error('[ChildHome] Error fetching child data:', err);
        throw err;
      }
    }
  );
  const child = data ?? null;
  const loading = Boolean(childId) && !loaded && !error;

  // Once Home has its own data, start My Journey's list so that page opens already filled.
  useEffect(() => {
    if (!loading && childId) dispatch(prefetchChildJourney(childId));
  }, [loading, childId, dispatch]);

  // Listen for child stats updates and refresh data
  useEffect(() => {
    if (!childId) return undefined;
    const handleStatsUpdate = () => {
      refresh().catch(() => {});
    };
    window.addEventListener('childStatsUpdated', handleStatsUpdate);
    return () => {
      window.removeEventListener('childStatsUpdated', handleStatsUpdate);
    };
  }, [childId, refresh]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        paddingBottom: CHILD_PAGE_NAV_CLEARANCE,
        paddingTop: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <Box
        sx={{
          maxWidth: '848px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Start Learning Welcome Card */}
        <ChildHomeStartLearning child={child} loading={loading} />

        {/* Next Live Class Card — loads alongside the child record, with its own placeholder */}
        <ChildHomeLiveClass />

        {/* Accumulated Awards */}
        <ChildHomeAccumlatedAwards child={child} loading={loading} />
      </Box>
    </Box>
  );
};

export default ChildHome;
