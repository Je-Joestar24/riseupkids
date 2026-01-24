import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import ChildHomeStartLearning from '../../components/child/home/ChildHomeStartLearning';
import ChildHomeLiveClass from '../../components/child/home/ChildHomeLiveClass';
import ChildHomeAccumlatedAwards from '../../components/child/home/ChildHomeAccumlatedAwards';
import childrenService from '../../services/childrenService';
import { themeColors } from '../../config/themeColors';

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
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch child data from API
  useEffect(() => {
    const fetchChildData = async () => {
      if (!childId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await childrenService.getChildById(childId);
        setChild(response.data || response);
      } catch (err) {
        console.error('[ChildHome] Error fetching child data:', err);
        setError(err?.message || 'Failed to load child data');
      } finally {
        setLoading(false);
      }
    };

    fetchChildData();
  }, [childId]);

  // Listen for child stats updates and refresh data
  useEffect(() => {
    const handleStatsUpdate = () => {
      if (childId) {
        childrenService.getChildById(childId)
          .then((response) => {
            setChild(response.data || response);
          })
          .catch((err) => {
            console.error('[ChildHome] Error refreshing child data:', err);
          });
      }
    };

    window.addEventListener('childStatsUpdated', handleStatsUpdate);
    return () => {
      window.removeEventListener('childStatsUpdated', handleStatsUpdate);
    };
  }, [childId]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress sx={{ color: themeColors.primary }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        paddingBottom: '90px', // Space for fixed bottom navigation
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
        <ChildHomeStartLearning child={child} />

        {/* Next Live Class Card */}
        <ChildHomeLiveClass />

        {/* Accumulated Awards */}
        <ChildHomeAccumlatedAwards child={child} />
      </Box>
    </Box>
  );
};

export default ChildHome;
