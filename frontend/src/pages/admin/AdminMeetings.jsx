import React, { useEffect, useState } from 'react';
import { Box, Alert, Snackbar } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MeetingsHeader from '../../components/admin/meetings/MeetingsHeader';
import MeetingsBody from '../../components/admin/meetings/MeetingsBody';
import MeetingCreateModal from '../../components/admin/meetings/MeetingCreateModal';
import useMeetings from '../../hooks/meetingHooks';

/**
 * AdminMeetings Page
 * 
 * Main page for managing meetings
 * Displays meetings list with filters, pagination, and actions
 */
const AdminMeetings = () => {
  const { fetchMeetings, fetchConnectionStatus } = useMeetings();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch meetings on mount
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Check for OAuth callback success
  useEffect(() => {
    const success = searchParams.get('success');
    const email = searchParams.get('email');
    
    if (success === 'true') {
      // Refresh connection status after successful OAuth
      fetchConnectionStatus();
      
      // Show success message
      if (email) {
        setSuccessMessage(`Google account connected successfully: ${email}`);
      } else {
        setSuccessMessage('Google account connected successfully!');
      }
      
      // Clean up URL params after showing message
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('success');
      newSearchParams.delete('email');
      navigate(`/admin/meetings?${newSearchParams.toString()}`, { replace: true });
    }
  }, [searchParams, fetchConnectionStatus, navigate]);

  const handleCreateClick = () => {
    setCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    fetchMeetings(); // Refresh the list
  };

  const handleCloseSuccess = () => {
    setSuccessMessage(null);
  };

  return (
    <Box
      sx={{
        padding: 3,
        minHeight: '100vh',
        backgroundColor: 'transparent',
      }}
    >
      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSuccess}
          severity="success"
          sx={{ width: '100%', fontFamily: 'Quicksand, sans-serif' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Header */}
      <MeetingsHeader onCreateClick={handleCreateClick} />

      {/* Body - Contains Filters, List, and Pagination */}
      <MeetingsBody />

      {/* Create Meeting Modal */}
      <MeetingCreateModal
        open={createModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleCreateSuccess}
      />

      
    </Box>
  );
};

export default AdminMeetings;
