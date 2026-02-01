import React, { useEffect, useState, useCallback } from 'react';
import { Box, Alert, Snackbar, Paper, Stack, Typography } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import YoutubeHeader from '../../components/admin/youtube/YoutubeHeader';
import YoutubeBody from '../../components/admin/youtube/YoutubeBody';
import YoutubeLiveCreateModal from '../../components/admin/youtube/YoutubeLiveCreateModal';
import YoutubeFilters from '../../components/admin/youtube/YoutubeFilters';
import YoutubeLiveList from '../../components/admin/youtube/YoutubeLiveList';
import YoutubePagination from '../../components/admin/youtube/YoutubePagination';
import YoutubeViewModal from '../../components/admin/youtube/YoutubeViewModal';
import useYouTubeLive from '../../hooks/youtubeHook';
import { showConfirmationDialog } from '../../store/slices/uiSlice';
import { useDispatch } from 'react-redux';
import { themeColors } from '../../config/themeColors';

/**
 * AdminYoutubeLive Page
 *
 * Main page for managing YouTube Live streams: connection status, create stream,
 * list with search/pagination, view detail, archive, delete.
 */
const AdminYoutubeLive = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    checkConnection,
    getLives,
    lives,
    pagination,
    filters,
    setLiveFilters,
    listLoading,
    actionLoading,
    archiveLive,
    endLive,
    deleteLive,
    liveError,
  } = useYouTubeLive();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedLiveId, setSelectedLiveId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const refetchLives = useCallback(() => {
    getLives(filters);
  }, [getLives, filters]);

  // Fetch list when filters change (page, limit, search, isArchived)
  useEffect(() => {
    getLives(filters);
  }, [filters.page, filters.limit, filters.search, filters.isArchived]);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // OAuth callback success
  useEffect(() => {
    const success = searchParams.get('success');
    const email = searchParams.get('email');
    if (success === 'true') {
      checkConnection();
      setSuccessMessage(email ? `YouTube account connected successfully: ${email}` : 'YouTube account connected successfully!');
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('success');
      newSearchParams.delete('email');
      navigate(`/admin/youtube-live?${newSearchParams.toString()}`, { replace: true });
    }
  }, [searchParams, checkConnection, navigate]);

  const handleCreateClick = () => setCreateModalOpen(true);
  const handleCloseCreateModal = () => setCreateModalOpen(false);

  const handleCreateSuccess = (streamData) => {
    setCreateModalOpen(false);
    refetchLives();
    if (streamData?.title) {
      setSuccessMessage(`Live stream "${streamData.title}" created. Configure OBS with the stream key.`);
    }
  };

  const handleCloseSuccess = () => setSuccessMessage(null);

  const handleFiltersChange = (next) => {
    setLiveFilters({ ...filters, ...next });
  };

  const handlePageChange = (page) => {
    setLiveFilters({ ...filters, page });
  };

  const handleLimitChange = (limit) => {
    setLiveFilters({ ...filters, limit, page: 1 });
  };

  const handleView = (live) => {
    const id = live._id || live.id;
    setSelectedLiveId(id);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setSelectedLiveId(null);
  };

  const handleArchive = (live) => {
    const id = live._id || live.id;
    const title = live.title || 'This live';
    dispatch(
      showConfirmationDialog({
        title: 'Archive Live Stream',
        message: `Archive "${title}"? You can still view it in the archived list.`,
        onConfirm: async () => {
          try {
            await archiveLive(id);
            refetchLives();
          } catch (err) {
            console.error('Failed to archive:', err);
          }
        },
      })
    );
  };

  const handleEnd = (live) => {
    const id = live._id || live.id;
    const title = live.title || 'This live';
    dispatch(
      showConfirmationDialog({
        title: 'End Stream',
        message: `End the YouTube broadcast "${title}"? This will complete the stream on YouTube (e.g. after you stopped OBS).`,
        onConfirm: async () => {
          try {
            await endLive(id);
            refetchLives();
            if (selectedLiveId === id) handleCloseViewModal();
          } catch (err) {
            console.error('Failed to end stream:', err);
          }
        },
      })
    );
  };

  const handleDelete = (live) => {
    const id = live._id || live.id;
    const title = live.title || 'This live';
    dispatch(
      showConfirmationDialog({
        title: 'Delete Live Stream',
        message: `Delete "${title}" from the LMS? This cannot be undone.`,
        onConfirm: async () => {
          try {
            await deleteLive(id);
            refetchLives();
            if (selectedLiveId === id) handleCloseViewModal();
          } catch (err) {
            console.error('Failed to delete:', err);
          }
        },
      })
    );
  };

  const border = theme.palette.border?.main || themeColors.border;

  return (
    <Box
      sx={{
        padding: 3,
        minHeight: '100vh',
        backgroundColor: 'transparent',
      }}
    >
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

      <YoutubeHeader onCreateClick={handleCreateClick} />

      {/* Your Live Streams */}
      <Paper
        sx={{
          marginTop: 4,
          borderRadius: '16px',
          border: `1px solid ${border}`,
          boxShadow: theme.shadows[2],
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            padding: 2.5,
            borderBottom: `1px solid ${border}`,
            backgroundColor: theme.palette.background.default,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              color: theme.palette.text.primary,
              marginBottom: 2,
            }}
          >
            Your Live Streams
          </Typography>
          <YoutubeFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            disabled={listLoading}
          />
        </Box>
        <YoutubeLiveList
          lives={lives}
          listLoading={listLoading}
          actionLoading={actionLoading}
          onView={handleView}
          onEnd={handleEnd}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
        {lives.length > 0 && (
          <YoutubePagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            disabled={listLoading}
          />
        )}
      </Paper>

      <YoutubeLiveCreateModal
        open={createModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={handleCreateSuccess}
      />

      <YoutubeViewModal
        open={viewModalOpen}
        liveId={selectedLiveId}
        onClose={handleCloseViewModal}
        onEnd={handleEnd}
        onRefetch={refetchLives}
      />
    </Box>
  );
};

export default AdminYoutubeLive;
