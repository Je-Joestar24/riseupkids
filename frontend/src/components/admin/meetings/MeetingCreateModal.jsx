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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon } from '@mui/icons-material';
import useMeetings from '../../../hooks/meetingHooks';

/**
 * MeetingCreateModal Component
 * 
 * Modal for creating a new Google Meet meeting
 */
const MeetingCreateModal = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const { createGoogleMeeting, connectionStatus, loading } = useMeetings();

  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    startTime: '',
    endTime: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    attendees: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.summary.trim()) {
      newErrors.summary = 'Meeting title is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    } else {
      const start = new Date(formData.startTime);
      if (isNaN(start.getTime())) {
        newErrors.startTime = 'Invalid start time';
      }
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    } else {
      const end = new Date(formData.endTime);
      if (isNaN(end.getTime())) {
        newErrors.endTime = 'Invalid end time';
      } else if (formData.startTime && new Date(formData.startTime) >= end) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    if (!formData.timeZone) {
      newErrors.timeZone = 'Timezone is required';
    }

    // Validate attendees if provided
    if (formData.attendees) {
      const emails = formData.attendees.split(',').map((email) => email.trim()).filter(Boolean);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emails.filter((email) => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        newErrors.attendees = 'One or more email addresses are invalid';
      }
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
      };

      const result = await createGoogleMeeting(meetingData);
      
      // If OAuth is required, the hook will handle redirect
      if (result && !result.requiresOAuth) {
        handleClose();
        if (onSuccess) {
          onSuccess(result);
        }
      }
    } catch (err) {
      console.error('Failed to create meeting:', err);
      setSubmitError(err.message || 'Failed to create meeting. Please try again.');
    }
  };

  const handleClose = () => {
    setFormData({
      summary: '',
      description: '',
      startTime: '',
      endTime: '',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      attendees: '',
    });
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
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
          Create Meeting
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

          {!connectionStatus.connected && connectionStatus.oAuthEnabled && (
            <Alert severity="warning" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              Please connect your Google account to create meetings.
            </Alert>
          )}

          <form onSubmit={handleSubmit} id="meeting-create-form">
            <Stack spacing={2.5}>
              <TextField
                label="Meeting Title"
                name="summary"
                value={formData.summary}
                onChange={handleInputChange}
                required
                fullWidth
                error={!!errors.summary}
                helperText={errors.summary}
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
                label="Start Time"
                name="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={handleInputChange}
                required
                fullWidth
                error={!!errors.startTime}
                helperText={errors.startTime}
                InputLabelProps={{
                  shrink: true,
                  sx: { fontFamily: 'Quicksand, sans-serif' },
                }}
                InputProps={{
                  sx: { fontFamily: 'Quicksand, sans-serif' },
                }}
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
                InputLabelProps={{
                  shrink: true,
                  sx: { fontFamily: 'Quicksand, sans-serif' },
                }}
                InputProps={{
                  sx: { fontFamily: 'Quicksand, sans-serif' },
                }}
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
                InputProps={{
                  sx: { fontFamily: 'Quicksand, sans-serif' },
                }}
                InputLabelProps={{
                  sx: { fontFamily: 'Quicksand, sans-serif' },
                }}
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
                InputProps={{
                  sx: { fontFamily: 'Quicksand, sans-serif' },
                }}
                InputLabelProps={{
                  sx: { fontFamily: 'Quicksand, sans-serif' },
                }}
              />
            </Stack>
          </form>
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
          Cancel
        </Button>
        <Button
          type="submit"
          form="meeting-create-form"
          variant="contained"
          disabled={
            loading ||
            !formData.summary ||
            !formData.startTime ||
            !formData.endTime ||
            (!connectionStatus.connected && connectionStatus.oAuthEnabled)
          }
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            textTransform: 'none',
            borderRadius: '8px',
          }}
        >
          {loading ? <CircularProgress size={20} /> : 'Create Meeting'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeetingCreateModal;
