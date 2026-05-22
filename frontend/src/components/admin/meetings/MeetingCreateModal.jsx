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
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, Link as LinkIcon, VideoCall as VideoCallIcon } from '@mui/icons-material';
import useMeetings from '../../../hooks/meetingHooks';
import CoverImageUpload from '../../common/CoverImageUpload';
import {
  getContentFormFieldSx,
  getContentFormPaperSx,
  getContentFormPrimaryButtonSx,
  CONTENT_FORM_MODAL_MAX_WIDTH,
} from '../../common/contentFormBento';

const CREATE_MODE_GOOGLE = 'google';
const CREATE_MODE_MANUAL = 'manual';

/**
 * MeetingCreateModal Component
 *
 * Modal for creating a new meeting:
 * - With Google: creates Google Meet event (requires OAuth).
 * - Manual: title, description, and link only (no Google required).
 */
const MeetingCreateModal = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const { createGoogleMeeting, createManualMeeting, connectionStatus, loading } = useMeetings();

  const [createMode, setCreateMode] = useState(CREATE_MODE_MANUAL);

  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    startTime: '',
    endTime: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    attendees: '',
    meetLink: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const validateGoogleForm = () => {
    const newErrors = {};
    if (!formData.summary.trim()) newErrors.summary = 'Meeting title is required';
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    } else {
      const start = new Date(formData.startTime);
      if (isNaN(start.getTime())) newErrors.startTime = 'Invalid start time';
    }
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    } else {
      const end = new Date(formData.endTime);
      if (isNaN(end.getTime())) newErrors.endTime = 'Invalid end time';
      else if (formData.startTime && new Date(formData.startTime) >= end) newErrors.endTime = 'End time must be after start time';
    }
    if (!formData.timeZone) newErrors.timeZone = 'Timezone is required';
    if (formData.attendees) {
      const emails = formData.attendees.split(',').map((e) => e.trim()).filter(Boolean);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emails.some((email) => !emailRegex.test(email))) newErrors.attendees = 'One or more email addresses are invalid';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateManualForm = () => {
    const newErrors = {};
    if (!formData.summary.trim()) newErrors.summary = 'Title is required';
    if (!formData.meetLink.trim()) newErrors.meetLink = 'Meeting link is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (createMode === CREATE_MODE_MANUAL) {
      if (!validateManualForm()) return;
      try {
        const result = await createManualMeeting({
          title: formData.summary.trim(),
          description: formData.description?.trim() || '',
          meetLink: formData.meetLink.trim(),
          ...(coverImageFile ? { coverImage: coverImageFile } : {}),
        });
        handleClose();
        if (onSuccess) onSuccess(result);
      } catch (err) {
        console.error('Failed to create manual meeting:', err);
        setSubmitError(err.message || 'Failed to create meeting. Please try again.');
      }
      return;
    }

    if (!validateGoogleForm()) return;

    try {
      const attendees = formData.attendees
        ? formData.attendees.split(',').map((email) => email.trim()).filter(Boolean)
        : [];
      const meetingData = {
        summary: formData.summary,
        description: formData.description || undefined,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        timeZone: formData.timeZone,
        attendees: attendees.length > 0 ? attendees : undefined,
        ...(coverImageFile ? { coverImage: coverImageFile } : {}),
      };

      const result = await createGoogleMeeting(meetingData);
      if (result && !result.requiresOAuth) {
        handleClose();
        if (onSuccess) onSuccess(result);
      }
    } catch (err) {
      console.error('Failed to create meeting:', err);
      setSubmitError(err.message || 'Failed to create meeting. Please try again.');
    }
  };

  const handleClose = () => {
    setCreateMode(CREATE_MODE_MANUAL);
    setFormData({
      summary: '',
      description: '',
      startTime: '',
      endTime: '',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      attendees: '',
      meetLink: '',
    });
    setErrors({});
    setSubmitError(null);
    setCoverImageFile(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: '20px',
          fontFamily: 'Quicksand, sans-serif',
          maxWidth: CONTENT_FORM_MODAL_MAX_WIDTH,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 3,
          borderBottom: `2px solid ${theme.palette.border.main}`,
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
          Create Meeting
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3, pt: 2 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
            Add a cover for the child home card, then fill in meeting details. Cover uses a portrait 6×4 ratio.
          </Typography>

          {submitError && (
            <Alert severity="error" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              {submitError}
            </Alert>
          )}

          {createMode === CREATE_MODE_GOOGLE && !connectionStatus?.connected && connectionStatus?.oAuthEnabled && (
            <Alert severity="warning" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              Connect your Google account to create Google Meet meetings, or use &quot;Add link manually&quot; below.
            </Alert>
          )}

          <ToggleButtonGroup
            value={createMode}
            exclusive
            onChange={(_, value) => value && setCreateMode(value)}
            sx={{ fontFamily: 'Quicksand, sans-serif' }}
          >
            <ToggleButton value={CREATE_MODE_MANUAL} aria-label="Add link manually">
              <LinkIcon sx={{ mr: 0.5 }} />
              Add link manually
            </ToggleButton>
            <ToggleButton
              value={CREATE_MODE_GOOGLE}
              aria-label="Create with Google Meet"
              disabled={!connectionStatus?.connected}
            >
              <VideoCallIcon sx={{ mr: 0.5 }} />
              Create with Google
            </ToggleButton>
          </ToggleButtonGroup>

          <form onSubmit={handleSubmit} id="meeting-create-form">
            <Grid container spacing={2} alignItems="stretch">
              <Grid item xs={12} md={5}>
                <CoverImageUpload
                  label="Cover photo"
                  file={coverImageFile}
                  onFileChange={setCoverImageFile}
                  disabled={loading}
                  inputId="meeting-create-cover"
                />
              </Grid>
              <Grid item xs={12} md={7}>
                <Paper variant="outlined" sx={{ ...getContentFormPaperSx(theme), display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={createMode === CREATE_MODE_MANUAL ? 'Title' : 'Meeting Title'}
                name="summary"
                value={formData.summary}
                onChange={handleInputChange}
                required
                fullWidth
                error={!!errors.summary}
                helperText={errors.summary}
                sx={getContentFormFieldSx()}
              />

              <TextField
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={4}
                fullWidth
                sx={getContentFormFieldSx()}
              />

              {createMode === CREATE_MODE_MANUAL && (
                <TextField
                  label="Meeting Link"
                  name="meetLink"
                  value={formData.meetLink}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  placeholder="https://meet.google.com/xxx-xxxx-xxx or any video link"
                  error={!!errors.meetLink}
                  helperText={errors.meetLink}
                  sx={getContentFormFieldSx()}
                />
              )}

              {createMode === CREATE_MODE_GOOGLE && (
                <>
                  <TextField
                    label="Start Time"
                    name="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                    fullWidth
                    error={!!errors.startTime}
                    helperText={errors.startTime}
                    InputLabelProps={{ shrink: true }}
                    sx={getContentFormFieldSx()}
                  />

                  <TextField
                    label="End Time"
                    name="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                    fullWidth
                    error={!!errors.endTime}
                    helperText={errors.endTime}
                    InputLabelProps={{ shrink: true }}
                    sx={getContentFormFieldSx()}
                  />

                  <TextField
                    label="Timezone"
                    name="timeZone"
                    value={formData.timeZone}
                    onChange={handleInputChange}
                    required
                    fullWidth
                    error={!!errors.timeZone}
                    helperText={errors.timeZone || 'e.g., America/New_York, Europe/London'}
                    sx={getContentFormFieldSx()}
                  />

                  <TextField
                    label="Attendees (Optional)"
                    name="attendees"
                    value={formData.attendees}
                    onChange={handleInputChange}
                    fullWidth
                    placeholder="email1@example.com, email2@example.com"
                    helperText={errors.attendees || 'Comma-separated email addresses'}
                    error={!!errors.attendees}
                    sx={getContentFormFieldSx()}
                  />
                </>
              )}
                </Paper>
              </Grid>
            </Grid>
          </form>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          padding: 3,
          borderTop: `2px solid ${theme.palette.border.main}`,
        }}
      >
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            borderRadius: '10px',
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="meeting-create-form"
          variant="contained"
          disabled={
            loading ||
            !formData.summary ||
            (createMode === CREATE_MODE_MANUAL ? !formData.meetLink : (
              !formData.startTime ||
              !formData.endTime ||
              (connectionStatus?.oAuthEnabled && !connectionStatus?.connected)
            ))
          }
          sx={getContentFormPrimaryButtonSx(theme)}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Meeting'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeetingCreateModal;
