import React from 'react';
import {
  Box,
  Typography,
  Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { VideoCall as VideoCallIcon } from '@mui/icons-material';
import MeetingFilters from './MeetingFilters';
import MeetingList from './MeetingList';
import MeetingPagination from './MeetingPagination';
import useMeetings from '../../../hooks/meetingHooks';

/**
 * MeetingsBody Component
 *
 * Body section for Meetings management page
 * Shows filters, meetings list, and pagination
 */
const MeetingsBody = () => {
  const theme = useTheme();
  const { meetings, loading } = useMeetings();

  // Show empty state only when not loading and no meetings
  if (!loading && meetings.length === 0) {
    return (
      <>
        <MeetingFilters />
        <Paper
          sx={{
            padding: 3.5,
            borderRadius: '16px',
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.border.main}`,
            boxShadow: theme.shadows[2],
          }}
        >
          <Box sx={{ textAlign: 'center', padding: 4 }}>
            <VideoCallIcon
              sx={{
                fontSize: 64,
                color: theme.palette.text.secondary,
                marginBottom: 2,
              }}
            />
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                color: theme.palette.text.primary,
                marginBottom: 1,
              }}
            >
              No meetings found
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
              }}
            >
              Create your first meeting to get started
            </Typography>
          </Box>
        </Paper>
      </>
    );
  }

  return (
    <>
      <MeetingFilters />
      <MeetingList />
      <MeetingPagination />
    </>
  );
};

export default MeetingsBody;
