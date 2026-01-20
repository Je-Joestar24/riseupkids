import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import parentDashboardService from '../../../services/parentDashboardService';
import ChildProgressModalHeader from './ChildProgressModalHeader';
import ChildProgressModalProgressOverview from './ChildProgressModalProgressOverview';
import ChildProgressModalWeeklyActivities from './ChildProgressModalWeeklyActivities';
import ChildProgressModalFooter from './ChildProgressModalFooter';

/**
 * ChildProgressModal Component
 * 
 * Modal displaying child's progress summary:
 * - Total Stars
 * - Learning Time
 * - This Week's Activity (top 4 newest courses)
 * 
 * Features:
 * - Glassy backdrop
 * - Solid container
 * - Mobile responsive
 */
const ChildProgressModal = ({ open, onClose, childId, childName }) => {
  const [loading, setLoading] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [error, setError] = useState(null);
  const [loadedChildId, setLoadedChildId] = useState(null);

  useEffect(() => {
    if (open && childId && childId !== loadedChildId) {
      // Only load data when modal is opened and childId hasn't been loaded yet
      loadProgressData();
    } else if (!open) {
      // Reset data when modal closes
      setProgressData(null);
      setError(null);
      setLoading(false);
      setLoadedChildId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, childId]);

  const loadProgressData = async () => {
    if (!childId || loading) return; // Prevent duplicate calls

    setLoading(true);
    setError(null);
    setLoadedChildId(childId);

    try {
      const response = await parentDashboardService.getChildProgress(childId);
      if (response.success && response.data) {
        console.log('[ChildProgressModal] Progress data received:', response.data);
        console.log('[ChildProgressModal] Star sources:', response.data.starSources);
        setProgressData(response.data);
      } else {
        throw new Error(response.message || 'Failed to load progress data');
      }
    } catch (err) {
      console.error('Error loading child progress:', err);
      setError(err.message || 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };


  const displayName = progressData?.child?.displayName || progressData?.child?.name || childName || 'Child';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: { xs: '16px', sm: '20px' },
          backgroundColor: themeColors.bgCard,
          maxHeight: '90vh',
          overflow: 'hidden',
          maxWidth: '672px',
          width: '100%',
          backgroundImage: 'linear-gradient(in oklab, rgb(212, 230, 227) 0%, rgb(255, 254, 253) 100%)',
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        },
      }}
    >
      {/* Header */}
      <ChildProgressModalHeader childName={displayName} onClose={onClose} />

      <DialogContent
        sx={{
          padding: '24px',
          overflowY: 'auto',
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 4,
            }}
          >
            <CircularProgress sx={{ color: themeColors.secondary }} />
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 4,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: themeColors.error,
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            >
              {error}
            </Typography>
          </Box>
        ) : progressData ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Progress Overview */}
            <ChildProgressModalProgressOverview
              totalStars={progressData.totalStars}
              learningTimeHours={progressData.learningTimeHours}
              childName={displayName}
            />

            {/* This Week's Activity */}
            <ChildProgressModalWeeklyActivities courses={progressData.courses} />

            {/* Footer - Star Sources (shows where stars came from) */}
            <ChildProgressModalFooter starSources={progressData.starSources} />
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default ChildProgressModal;
