import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { themeColors } from '../../../config/themeColors';
import { useAuth } from '../../../hooks/userHook';
import { showNotification } from '../../../store/slices/uiSlice';
import contactSupportService from '../../../services/contactSupportService';

/**
 * ContactUsForm Component
 * 
 * Contact form for users to submit support requests
 * Includes email, subject, and message fields
 * 
 * @param {Function} onSuccess - Callback function called when form is successfully submitted
 */
const ContactUsForm = ({ onSuccess }) => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  // Pre-fill email from logged-in user
  useEffect(() => {
    if (user?.email) {
      setFormData((prev) => ({
        ...prev,
        email: user.email,
      }));
    }
  }, [user]);

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.email || !formData.subject || !formData.message) {
      dispatch(showNotification({
        message: 'Please fill in all fields',
        type: 'error',
      }));
      return;
    }

    setLoading(true);

    try {
      const response = await contactSupportService.submitContactMessage(
        formData.email,
        formData.subject,
        formData.message
      );

      if (response.success) {
        // Show success notification
        dispatch(showNotification({
          message: response.message || 'Message sent successfully! We will get back to you soon.',
          type: 'success',
          duration: 5000,
        }));

        // Reset form after successful submission
        setFormData({
          email: user?.email || '',
          subject: '',
          message: '',
        });

        // Call onSuccess callback to close modal
        if (onSuccess) {
          // Small delay to ensure notification is shown
          setTimeout(() => {
            onSuccess();
          }, 100);
        }
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      // Show error notification
      dispatch(showNotification({
        message: error || 'Failed to send message. Please try again.',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.25rem', sm: '1.25rem' },
          fontWeight: 700,
          color: themeColors.secondary,
          paddingX: { xs: 1, sm: 1 },
        }}
      >
        Still need help? Contact us
      </Typography>

      <Card
        sx={{
          borderRadius: { xs: '20px', sm: '24px' },
          backgroundColor: themeColors.bgCard,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <CardContent sx={{ padding: { xs: 3, sm: 3.75 } }}>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Email Field */}
            <Box>
              <Typography
                component="label"
                sx={{
                  display: 'block',
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                  fontWeight: 400,
                  color: themeColors.textSecondary,
                  marginBottom: 1,
                }}
              >
                Your Email
              </Typography>
              <TextField
                type="email"
                fullWidth
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange('email')}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    borderRadius: { xs: '12px', sm: '16px' },
                    '& fieldset': {
                      borderWidth: '2px',
                      borderColor: themeColors.borderSecondary,
                    },
                    '&:hover fieldset': {
                      borderColor: themeColors.secondary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: themeColors.secondary,
                    },
                  },
                }}
              />
            </Box>

            {/* Subject Field */}
            <Box>
              <Typography
                component="label"
                sx={{
                  display: 'block',
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                  fontWeight: 400,
                  color: themeColors.textSecondary,
                  marginBottom: 1,
                }}
              >
                Subject
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={formData.subject}
                  onChange={handleChange('subject')}
                  required
                  displayEmpty
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    borderRadius: { xs: '12px', sm: '16px' },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '2px',
                      borderColor: themeColors.borderSecondary,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: themeColors.secondary,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: themeColors.secondary,
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Select a subject
                  </MenuItem>
                  <MenuItem value="technical">Technical Issue</MenuItem>
                  <MenuItem value="billing">Billing Question</MenuItem>
                  <MenuItem value="content">Content Feedback</MenuItem>
                  <MenuItem value="feature">Feature Request</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Message Field */}
            <Box>
              <Typography
                component="label"
                sx={{
                  display: 'block',
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                  fontWeight: 400,
                  color: themeColors.textSecondary,
                  marginBottom: 1,
                }}
              >
                Message
              </Typography>
              <TextField
                multiline
                rows={5}
                fullWidth
                placeholder="Tell us how we can help..."
                value={formData.message}
                onChange={handleChange('message')}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    borderRadius: { xs: '12px', sm: '16px' },
                    '& fieldset': {
                      borderWidth: '2px',
                      borderColor: themeColors.borderSecondary,
                    },
                    '&:hover fieldset': {
                      borderColor: themeColors.secondary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: themeColors.secondary,
                    },
                  },
                  '& .MuiInputBase-input': {
                    resize: 'none',
                  },
                }}
              />
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '1rem', sm: '1.25rem' },
                fontWeight: 600,
                backgroundColor: themeColors.secondary,
                color: themeColors.textInverse,
                paddingY: { xs: '16px', sm: '16px' },
                borderRadius: { xs: '16px', sm: '16px' },
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                textTransform: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                '&:hover': {
                  backgroundColor: themeColors.primary,
                  boxShadow: '0 6px 8px rgba(0, 0, 0, 0.15)',
                },
                '&:disabled': {
                  backgroundColor: themeColors.textSecondary,
                  opacity: 0.6,
                },
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ color: themeColors.textInverse }} />
                  Sending...
                </>
              ) : (
                <>
                  <SendIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                  Send Message
                </>
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ContactUsForm;
