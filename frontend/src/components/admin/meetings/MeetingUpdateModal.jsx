import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon } from '@mui/icons-material';
import useMeetings from '../../../hooks/meetingHooks';

/**
 * MeetingUpdateModal Component
 * 
 * Modal for updating an existing meeting
 * Accepts either a meeting object (preferred) or meetingId
 * 
 * @param {Boolean} open - Modal open state
 * @param {Function} onClose - Close handler
 * @param {Object} meeting - Meeting object (preferred - loads data immediately)
 * @param {String} meetingId - Meeting ID (fallback - will fetch from API)
 * @param {Function} onSuccess - Success callback
 */
const MeetingUpdateModal = ({ open, onClose, meeting: meetingProp, meetingId, onSuccess }) => {
  const theme = useTheme();
  const { getMeetingById, updateMeeting, currentMeeting, meetings, loading, clearCurrent } = useMeetings();
  
  // Determine the meeting to use and its ID
  const meeting = meetingProp || currentMeeting;
  const targetMeetingId = meeting?._id || meetingId;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    timeZone: '',
    status: 'scheduled',
    attendees: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [fetching, setFetching] = useState(false);

  // Helper function to populate form from meeting data
  const populateForm = React.useCallback((meeting) => {
    if (!meeting) return;

    const startTime = meeting.startTime
      ? new Date(meeting.startTime).toISOString().slice(0, 16)
      : '';
    const endTime = meeting.endTime
      ? new Date(meeting.endTime).toISOString().slice(0, 16)
      : '';

    setFormData({
      title: meeting.title || '',
      description: meeting.description || '',
      startTime,
      endTime,
      timeZone: meeting.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: meeting.status || 'scheduled',
      attendees: meeting.attendees?.join(', ') || '',
    });
    setFetching(false);
  }, []);

  // Populate form when modal opens with meeting data
  useEffect(() => {
    if (open && targetMeetingId) {
      // Priority 1: Use meeting prop if provided (from MeetingList)
      if (meetingProp) {
        populateForm(meetingProp);
        return;
      }

      // Priority 2: Use currentMeeting from Redux (set by MeetingList via setCurrent)
      if (currentMeeting) {
        const currentId = currentMeeting._id?.toString();
        const targetId = targetMeetingId?.toString();
        
        if (currentId === targetId) {
          populateForm(currentMeeting);
          return;
        }
      }

      // Priority 3: Find in meetings list
      const existingMeeting = meetings.find(
        (m) => {
          const meetingIdStr = m._id?.toString();
          const targetIdStr = targetMeetingId?.toString();
          return meetingIdStr === targetIdStr || m._id === targetMeetingId;
        }
      );

      if (existingMeeting) {
        populateForm(existingMeeting);
      } else if (meetingId) {
        // Priority 4: Fetch from API only if we have meetingId but no meeting object
        setFetching(true);
        getMeetingById(meetingId)
          .then(() => {
            // The thunk will update currentMeeting in Redux
          })
          .catch((err) => {
            console.error('Failed to fetch meeting:', err);
            setSubmitError(err.message || 'Failed to load meeting details');
            setFetching(false);
          });
      } else {
        setSubmitError('No meeting data provided');
      }
    }
  }, [open, targetMeetingId, meetingProp, currentMeeting, meetings, meetingId, getMeetingById, populateForm]);

  // Populate form when currentMeeting is available (from API fetch)
  useEffect(() => {
    if (currentMeeting && targetMeetingId && fetching && !meetingProp) {
      // Compare IDs as strings to handle ObjectId vs string
      const currentId = currentMeeting._id?.toString();
      const targetId = targetMeetingId?.toString();
      
      if (currentId === targetId) {
        populateForm(currentMeeting);
      }
    }
  }, [currentMeeting, targetMeetingId, fetching, meetingProp, populateForm]);

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

    if (!formData.title.trim()) {
      newErrors.title = 'Meeting title is required';
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

      const updates = {
        title: formData.title,
        description: formData.description || undefined,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        timeZone: formData.timeZone,
        status: formData.status,
        attendees: attendees.length > 0 ? attendees : undefined,
      };

      // Get the meeting ID from the meeting object (preferred) or meetingId prop
      const finalMeetingId = meeting?._id || meetingId || targetMeetingId;
      
      if (!finalMeetingId) {
        setSubmitError('Meeting ID is required');
        return;
      }

      await updateMeeting(finalMeetingId, updates);
      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to update meeting:', err);
      setSubmitError(err.message || 'Failed to update meeting. Please try again.');
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: 'scheduled',
      attendees: '',
    });
    setErrors({});
    setSubmitError(null);
    setFetching(false);
    // Clear current meeting from Redux when modal closes
    clearCurrent();
    onClose();
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: 'scheduled',
        attendees: '',
      });
      setErrors({});
      setSubmitError(null);
      setFetching(false);
      // Clear current meeting from Redux
      clearCurrent();
    }
  }, [open, clearCurrent]);

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
          Update Meeting
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        {fetching ? (
          <Stack spacing={2} sx={{ marginTop: 2, alignItems: 'center', minHeight: 200, justifyContent: 'center' }}>
            <CircularProgress />
            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
              Loading meeting details...
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={3} sx={{ marginTop: 1 }}>
            {submitError && (
              <Alert severity="error" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                {submitError}
              </Alert>
            )}

            <form onSubmit={handleSubmit} id="meeting-update-form">
              <Stack spacing={2.5}>
                <TextField
                  label="Meeting Title"
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

                <FormControl fullWidth>
                  <InputLabel sx={{ fontFamily: 'Quicksand, sans-serif' }}>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    label="Status"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                    }}
                  >
                    <MenuItem value="scheduled" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                      Scheduled
                    </MenuItem>
                    <MenuItem value="completed" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                      Completed
                    </MenuItem>
                    <MenuItem value="cancelled" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                      Cancelled
                    </MenuItem>
                  </Select>
                </FormControl>

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
        )}
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
          form="meeting-update-form"
          variant="contained"
          disabled={loading || fetching || !formData.title || !formData.startTime || !formData.endTime}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            textTransform: 'none',
            borderRadius: '8px',
          }}
        >
          {loading ? <CircularProgress size={20} /> : 'Update Meeting'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeetingUpdateModal;
