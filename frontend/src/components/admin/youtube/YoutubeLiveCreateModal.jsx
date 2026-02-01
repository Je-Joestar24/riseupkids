import React, { useState } from 'react';
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
  CircularProgress,
  Box,
  Divider,
  Link,
  Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import useYouTubeLive from '../../../hooks/youtubeHook';
import { themeColors } from '../../../config/themeColors';

/**
 * YoutubeLiveCreateModal Component
 * 
 * Modal for creating a new YouTube live stream
 * Shows stream info (stream key, RTMP URL) after creation
 */
const YoutubeLiveCreateModal = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const {
    createLiveStream,
    streamLoading,
    streamError,
    createdStream,
    connectionStatus,
    getAuthUrl,
    clearStreamError,
    clearCreatedStream,
  } = useYouTubeLive();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (submitError) {
      setSubmitError(null);
    }
    clearStreamError();
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Stream title is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitError(null);
      clearStreamError();
      clearCreatedStream();

      const streamData = {
        title: formData.title,
        description: formData.description || undefined,
        privacyStatus: 'public',
        enableAutoStart: true,
        enableAutoStop: true,
      };

      const result = await createLiveStream(streamData);

      // If OAuth is required, the hook will handle redirect
      if (result && !result.requiresOAuth) {
        // Stream created successfully - don't close modal yet, show stream info
        // User can close manually after copying stream key
      }
    } catch (err) {
      console.error('Failed to create stream:', err);
      setSubmitError(err.message || 'Failed to create live stream. Please try again.');
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
    });
    setErrors({});
    setSubmitError(null);
    clearStreamError();
    clearCreatedStream();
    onClose();
  };

  const handleCopyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could show a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleConnectYouTube = async () => {
    try {
      await getAuthUrl();
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={createdStream ? "md" : "sm"}
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
          borderBottom: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography
          component="span"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.5rem',
          }}
        >
          Create Live Stream
        </Typography>
        <IconButton onClick={handleClose} size="small" aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        <Stack spacing={3} sx={{ marginTop: 1 }}>
          {submitError && (
            <Alert severity="error" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              {submitError}
            </Alert>
          )}

          {!connectionStatus.connected && (
            <Alert severity="warning" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              YouTube account is not connected. Please ask an admin to connect the YouTube account for the LMS channel.
            </Alert>
          )}

          {/* Success state: stream details + next steps */}
          {createdStream && !createdStream.requiresOAuth && (
            <Stack spacing={3}>
              <Alert
                severity="success"
                icon={<CheckCircleIcon />}
                sx={{ fontFamily: 'Quicksand, sans-serif' }}
              >
                <Typography variant="subtitle1" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>
                  Stream created successfully
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', marginTop: 0.5 }}>
                  Copy the details below and follow the steps to start streaming with OBS.
                </Typography>
              </Alert>

              {/* Stream details card */}
              <Paper
                variant="outlined"
                sx={{
                  padding: 2.5,
                  borderRadius: '12px',
                  border: `1px solid ${theme.palette.border?.main || themeColors.border}`,
                  backgroundColor: theme.palette.background?.default || themeColors.bgSecondary,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    color: theme.palette.text.primary,
                    marginBottom: 1.5,
                  }}
                >
                  Stream details (use these in OBS)
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, color: theme.palette.text.secondary }}>
                      Stream URL (RTMP) — paste in OBS as &quot;Server&quot;
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', marginTop: 0.5 }}>
                      <TextField
                        value={createdStream.rtmpUrl || ''}
                        fullWidth
                        size="small"
                        InputProps={{ readOnly: true }}
                        sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.875rem' } }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleCopyToClipboard(createdStream.rtmpUrl)}
                        sx={{ color: theme.palette.orange?.main || themeColors.orange }}
                        aria-label="Copy RTMP URL"
                      >
                        <CopyIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, color: theme.palette.text.secondary }}>
                      Stream Key — paste in OBS as &quot;Stream Key&quot;
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', marginTop: 0.5 }}>
                      <TextField
                        value={createdStream.streamKey || ''}
                        fullWidth
                        size="small"
                        type="password"
                        InputProps={{ readOnly: true }}
                        sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.875rem' } }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleCopyToClipboard(createdStream.streamKey)}
                        sx={{ color: theme.palette.orange?.main || themeColors.orange }}
                        aria-label="Copy stream key"
                      >
                        <CopyIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, color: theme.palette.text.secondary }}>
                      Watch URL: 
                    </Typography>
                    <Link
                      href={createdStream.watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontFamily: 'Quicksand, sans-serif',
                        fontSize: '0.875rem',
                        marginTop: 0.5,
                        wordBreak: 'break-all',
                      }}
                    >
                      {createdStream.watchUrl}
                      <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                    </Link>
                  </Box>
                  {createdStream.embedUrl && (
                    <Box>
                      <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, color: theme.palette.text.secondary }}>
                        Embed URL:
                      </Typography>
                      <Link
                        href={createdStream.embedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          fontFamily: 'Quicksand, sans-serif',
                          fontSize: '0.875rem',
                          marginTop: 0.5,
                          wordBreak: 'break-all',
                        }}
                      >
                        {createdStream.embedUrl}
                        <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                      </Link>
                    </Box>
                  )}
                </Stack>
              </Paper>

              {/* Next steps to go live (shown only after successful creation) */}
              <Paper
                variant="outlined"
                sx={{
                  padding: 2.5,
                  borderRadius: '12px',
                  border: `1px solid ${theme.palette.border?.main || themeColors.border}`,
                  backgroundColor: theme.palette.background?.paper || themeColors.bgCard,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 1.5 }}>
                  <InfoIcon sx={{ color: theme.palette.orange?.main || themeColors.orange }} />
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                    }}
                  >
                    Next steps to go live
                  </Typography>
                </Box>
                <Stack spacing={1.25} component="ol" sx={{ margin: 0, paddingLeft: 2.5 }}>
                  <Typography component="li" variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
                    Copy the <strong>Stream URL</strong> and <strong>Stream Key</strong> above (use the copy buttons).
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
                    Open <strong>OBS Studio</strong>. Go to <strong>Settings → Stream</strong>. Select <strong>Service: Custom</strong>.
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
                    Paste the <strong>Stream URL</strong> into the <strong>Server</strong> field and the <strong>Stream Key</strong> into the <strong>Stream Key</strong> field. Click <strong>Apply</strong> then <strong>OK</strong>.
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
                    In OBS, click <strong>Start Streaming</strong>. Your stream will appear on YouTube; share the <strong>Watch URL</strong> with students so they can watch.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          )}

          {/* Show form only if stream not created yet */}
          {!createdStream && (
            <form onSubmit={handleSubmit} id="stream-create-form">
              <Stack spacing={2.5}>
                <TextField
                  label="Stream Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  error={!!errors.title}
                  helperText={errors.title}
                  InputProps={{
                    sx: { fontFamily: 'Quicksand, sans-serif' },
                  }}
                  InputLabelProps={{
                    sx: { fontFamily: 'Quicksand, sans-serif' },
                  }}
                />

                <TextField
                  label="Description (Optional)"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  fullWidth
                  InputProps={{
                    sx: { fontFamily: 'Quicksand, sans-serif' },
                  }}
                  InputLabelProps={{
                    sx: { fontFamily: 'Quicksand, sans-serif' },
                  }}
                />
              </Stack>
            </form>
          )}
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          padding: 2,
          borderTop: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Button
          onClick={handleClose}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            textTransform: 'none',
          }}
        >
          {createdStream ? 'Close' : 'Cancel'}
        </Button>
        {!createdStream && (
          <Button
            type="submit"
            form="stream-create-form"
            variant="contained"
            disabled={
              streamLoading ||
              !formData.title ||
              !connectionStatus.connected
            }
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              textTransform: 'none',
              borderRadius: '8px',
              backgroundColor: theme.palette.orange?.main || theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.orange?.dark || theme.palette.primary.dark,
              },
            }}
          >
            {streamLoading ? <CircularProgress size={20} /> : 'Create Stream'}
          </Button>
        )}
        {createdStream && onSuccess && (
          <Button
            variant="contained"
            onClick={() => {
              handleClose();
              onSuccess(createdStream);
            }}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              textTransform: 'none',
              borderRadius: '8px',
              backgroundColor: theme.palette.orange?.main || theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.orange?.dark || theme.palette.primary.dark,
              },
            }}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default YoutubeLiveCreateModal;
