import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  IconButton,
  Alert,
  Box,
  Divider,
  Link,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenInNewIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import useYouTubeLive from '../../../hooks/youtubeHook';
import { themeColors } from '../../../config/themeColors';
import { getCoverImageUrl } from '../../../utils/coverImageUrl';

/**
 * YoutubeViewModal Component
 *
 * Detail view for one YouTube live: title, description, stream key, RTMP URL,
 * watch URL, embed URL, copy buttons, Archive, Delete (with confirm).
 */
const YoutubeViewModal = ({ open, liveId, onClose, onEnd, onArchive, onDelete, onRefetch }) => {
  const theme = useTheme();
  const orange = theme.palette.orange?.main || themeColors.orange;
  const border = theme.palette.border?.main || themeColors.border;

  const {
    currentLive,
    detailLoading,
    liveError,
    getLiveById,
    archiveLive,
    deleteLive,
    clearLiveDetail,
    clearLiveError,
  } = useYouTubeLive();

  useEffect(() => {
    if (open && liveId) {
      clearLiveError();
      getLiveById(liveId);
    }
    return () => {
      if (!open) clearLiveDetail();
    };
  }, [open, liveId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleArchive = async () => {
    if (!currentLive) return;
    const title = currentLive.title || 'This live';
    if (!window.confirm(`Archive "${title}"? You can still view it in the archived list.`)) return;
    const id = currentLive._id || currentLive.id;
    try {
      await archiveLive(id);
      onArchive?.();
      onRefetch?.();
      onClose();
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  };

  const handleDelete = async () => {
    if (!currentLive) return;
    const id = currentLive._id || currentLive.id;
    const title = currentLive.title || 'This live';
    if (!window.confirm(`Are you sure you want to delete "${title}" from the LMS? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteLive(id);
      onDelete?.();
      onRefetch?.();
      onClose();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleClose = () => {
    clearLiveError();
    onClose();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          fontFamily: 'Quicksand, sans-serif',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 3,
          borderBottom: `1px solid ${border}`,
        }}
      >
        <Typography
          component="span"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.25rem',
          }}
        >
          Live Stream Details
        </Typography>
        <IconButton onClick={handleClose} size="small" aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{
        padding: 3,
        marginTop: 2,
      }}>
        <Stack spacing={2}>
          {liveError && (
            <Alert severity="error" onClose={clearLiveError} sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              {liveError}
            </Alert>
          )}

          {detailLoading && !currentLive && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: orange }} />
            </Box>
          )}

          {currentLive && !detailLoading && (
            <>
              {getCoverImageUrl(currentLive.coverImage) && (
                <Box
                  component="img"
                  src={getCoverImageUrl(currentLive.coverImage)}
                  alt={currentLive.title ? `${currentLive.title} cover` : 'Live cover'}
                  sx={{
                    width: '100%',
                    maxHeight: 200,
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: `1px solid ${border}`,
                  }}
                />
              )}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                    marginBottom: 0.5,
                  }}
                >
                  Title
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  {currentLive.title || '—'}
                </Typography>
              </Box>
              {currentLive.description && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                      marginBottom: 0.5,
                    }}
                  >
                    Description
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', whiteSpace: 'pre-wrap' }}>
                    {currentLive.description}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                    marginBottom: 0.5,
                  }}
                >
                  Created
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  {formatDate(currentLive.createdAt)}
                </Typography>
              </Box>
              {currentLive.isArchived && (
                <Alert severity="info" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  This live stream is archived.
                </Alert>
              )}

              <Divider sx={{ my: 1 }} />

              <Box>
                <Typography variant="subtitle2" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, marginBottom: 0.5 }}>
                  Stream URL (RTMP)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    value={currentLive.rtmpUrl || ''}
                    fullWidth
                    size="small"
                    InputProps={{ readOnly: true }}
                    sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.875rem' } }}
                  />
                  <IconButton size="small" onClick={() => handleCopy(currentLive.rtmpUrl)} sx={{ color: orange }}>
                    <CopyIcon />
                  </IconButton>
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, marginBottom: 0.5 }}>
                  Stream Key
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    value={currentLive.streamKey || ''}
                    fullWidth
                    size="small"
                    type="password"
                    InputProps={{ readOnly: true }}
                    sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.875rem' } }}
                  />
                  <IconButton size="small" onClick={() => handleCopy(currentLive.streamKey)} sx={{ color: orange }}>
                    <CopyIcon />
                  </IconButton>
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, marginBottom: 0.5 }}>
                  Watch URL
                </Typography>
                <Link
                  href={currentLive.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontFamily: 'Quicksand, sans-serif' }}
                >
                  {currentLive.watchUrl}
                  <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                </Link>
              </Box>
              {currentLive.embedUrl && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, marginBottom: 0.5 }}>
                    Embed URL
                  </Typography>
                  <Link
                    href={currentLive.embedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontFamily: 'Quicksand, sans-serif' }}
                  >
                    {currentLive.embedUrl}
                    <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                  </Link>
                </Box>
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      {currentLive && !detailLoading && (
        <DialogActions
          sx={{
            padding: 2,
            borderTop: `1px solid ${border}`,
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {onEnd && currentLive.status !== 'complete' && (
            <Button
              variant="outlined"
              startIcon={<StopIcon />}
              onClick={() => onEnd(currentLive)}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                textTransform: 'none',
                borderRadius: '8px',
                borderColor: theme.palette.warning?.main || themeColors.warning,
                color: theme.palette.warning?.main || themeColors.warning,
                '&:hover': {
                  borderColor: theme.palette.warning?.main || themeColors.warning,
                  backgroundColor: `${theme.palette.warning?.main || themeColors.warning}14`,
                },
              }}
            >
              End Stream
            </Button>
          )}
          {!currentLive.isArchived && (
            <Button
              variant="outlined"
              startIcon={<ArchiveIcon />}
              onClick={handleArchive}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                textTransform: 'none',
                borderRadius: '8px',
                borderColor: orange,
                color: orange,
                '&:hover': { borderColor: orange, backgroundColor: `${orange}14` },
              }}
            >
              Archive
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            sx={{ fontFamily: 'Quicksand, sans-serif', textTransform: 'none', borderRadius: '8px' }}
          >
            Delete
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            onClick={handleClose}
            sx={{ fontFamily: 'Quicksand, sans-serif', textTransform: 'none', borderRadius: '8px' }}
          >
            Close
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default YoutubeViewModal;
