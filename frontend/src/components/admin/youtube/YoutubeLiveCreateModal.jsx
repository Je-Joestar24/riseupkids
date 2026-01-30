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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  Link,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import useYouTubeLive from '../../../hooks/youtubeHook';

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
    scheduledStartTime: '',
    privacyStatus: 'unlisted',
    enableAutoStart: false,
    enableAutoStop: false,
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

    if (formData.privacyStatus && !['public', 'unlisted', 'private'].includes(formData.privacyStatus)) {
      newErrors.privacyStatus = 'Invalid privacy status';
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
        scheduledStartTime: formData.scheduledStartTime || undefined,
        privacyStatus: formData.privacyStatus,
        enableAutoStart: formData.enableAutoStart,
        enableAutoStop: formData.enableAutoStop,
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
      scheduledStartTime: '',
      privacyStatus: 'unlisted',
      enableAutoStart: false,
      enableAutoStop: false,
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
        <IconButton onClick={handleClose} size="small">
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

          {streamError && (
            <Alert severity="error" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              {streamError}
            </Alert>
          )}

          {!connectionStatus.connected && (
            <Alert severity="warning" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              YouTube account is not connected. Please ask an admin to connect the YouTube account for the LMS channel.
            </Alert>
          )}

          {/* Show stream info if stream was created */}
          {createdStream && !createdStream.requiresOAuth && (
            <Alert
              severity="success"
              sx={{ fontFamily: 'Quicksand, sans-serif', marginBottom: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 1 }}>
                Stream Created Successfully!
              </Typography>
              <Typography variant="body2" sx={{ marginBottom: 2 }}>
                Configure OBS with the following details:
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: 0.5 }}>
                    Stream URL (RTMP):
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'center',
                    }}
                  >
                    <TextField
                      value={createdStream.rtmpUrl}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                      sx={{
                        '& .MuiInputBase-root': {
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                        },
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleCopyToClipboard(createdStream.rtmpUrl)}
                      sx={{ color: theme.palette.primary.main }}
                    >
                      <CopyIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: 0.5 }}>
                    Stream Key:
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'center',
                    }}
                  >
                    <TextField
                      value={createdStream.streamKey}
                      fullWidth
                      size="small"
                      type="password"
                      InputProps={{ readOnly: true }}
                      sx={{
                        '& .MuiInputBase-root': {
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                        },
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleCopyToClipboard(createdStream.streamKey)}
                      sx={{ color: theme.palette.primary.main }}
                    >
                      <CopyIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: 0.5 }}>
                    Watch URL:
                  </Typography>
                  <Link
                    href={createdStream.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      fontFamily: 'Quicksand, sans-serif',
                    }}
                  >
                    {createdStream.watchUrl}
                    <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                  </Link>
                </Box>
                {createdStream.embedUrl && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: 0.5 }}>
                      Embed URL:
                    </Typography>
                    <Link
                      href={createdStream.embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontFamily: 'Quicksand, sans-serif',
                      }}
                    >
                      {createdStream.embedUrl}
                      <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                    </Link>
                  </Box>
                )}
              </Stack>
            </Alert>
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

                <TextField
                  label="Scheduled Start Time (Optional)"
                  name="scheduledStartTime"
                  type="datetime-local"
                  value={formData.scheduledStartTime}
                  onChange={handleInputChange}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                    sx: { fontFamily: 'Quicksand, sans-serif' },
                  }}
                  InputProps={{
                    sx: { fontFamily: 'Quicksand, sans-serif' },
                  }}
                />

                <FormControl fullWidth>
                  <InputLabel sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                    Privacy Status
                  </InputLabel>
                  <Select
                    name="privacyStatus"
                    value={formData.privacyStatus}
                    onChange={handleInputChange}
                    label="Privacy Status"
                    sx={{ fontFamily: 'Quicksand, sans-serif' }}
                  >
                    <MenuItem value="public">Public</MenuItem>
                    <MenuItem value="unlisted">Unlisted</MenuItem>
                    <MenuItem value="private">Private</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Checkbox
                      name="enableAutoStart"
                      checked={formData.enableAutoStart}
                      onChange={handleInputChange}
                    />
                  }
                  label="Enable Auto-Start (stream starts automatically when OBS connects)"
                  sx={{ fontFamily: 'Quicksand, sans-serif' }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      name="enableAutoStop"
                      checked={formData.enableAutoStop}
                      onChange={handleInputChange}
                    />
                  }
                  label="Enable Auto-Stop (stream stops automatically when OBS disconnects)"
                  sx={{ fontFamily: 'Quicksand, sans-serif' }}
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
