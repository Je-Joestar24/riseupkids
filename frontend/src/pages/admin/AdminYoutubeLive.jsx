import React, { useEffect, useState } from 'react';
import { Box, Alert, Snackbar } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import YoutubeHeader from '../../components/admin/youtube/YoutubeHeader';
import YoutubeBody from '../../components/admin/youtube/YoutubeBody';
import YoutubeLiveCreateModal from '../../components/admin/youtube/YoutubeLiveCreateModal';
import useYouTubeLive from '../../hooks/youtubeHook';

/**
 * AdminYoutubeLive Page
 * 
 * Main page for managing YouTube Live streams
 * Displays connection status, instructions, and stream creation
 */
const AdminYoutubeLive = () => {
  const { checkConnection } = useYouTubeLive();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState(null);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Check for OAuth callback success
  useEffect(() => {
    const success = searchParams.get('success');
    const email = searchParams.get('email');
    
    if (success === 'true') {
      // Refresh connection status after successful OAuth
      checkConnection();
      
      // Show success message
      if (email) {
        setSuccessMessage(`YouTube account connected successfully: ${email}`);
      } else {
        setSuccessMessage('YouTube account connected successfully!');
      }
      
      // Clean up URL params after showing message
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('success');
      newSearchParams.delete('email');
      navigate(`/admin/youtube-live?${newSearchParams.toString()}`, { replace: true });
    }
  }, [searchParams, checkConnection, navigate]);

  const handleCreateClick = () => {
    setCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
  };

  const handleCreateSuccess = (streamData) => {
    setCreateModalOpen(false);
    // You could show a success message or update state here
    console.log('Stream created:', streamData);
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
      <YoutubeHeader onCreateClick={handleCreateClick} />

      {/* Body - Contains Instructions and Empty State */}
      <YoutubeBody />

      {/* Create Stream Modal */}
      <YoutubeLiveCreateModal
        open={createModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleCreateSuccess}
      />
    </Box>
  );
};

export default AdminYoutubeLive;
