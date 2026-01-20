import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  Close,
} from '@mui/icons-material';
import { hideNotification, hideConfirmationDialog } from '../../../store/slices/uiSlice';
import { themeColors } from '../../../config/themeColors';

/**
 * ContactSupportCustomDialog Component
 * 
 * Professional dialog box for parents
 * Handles both notifications and confirmation dialogs
 * Minimalist, clean design following parent theme colors
 */
const ContactSupportCustomDialog = () => {
  const dispatch = useDispatch();
  const { notification, confirmationDialog } = useSelector((state) => state.ui);

  // Handle notification close
  const handleNotificationClose = () => {
    dispatch(hideNotification());
  };

  // Handle confirmation dialog confirm
  const handleConfirm = () => {
    if (confirmationDialog.onConfirm) {
      confirmationDialog.onConfirm();
    }
    dispatch(hideConfirmationDialog());
  };

  // Handle confirmation dialog cancel
  const handleCancel = () => {
    if (confirmationDialog.onCancel) {
      confirmationDialog.onCancel();
    }
    dispatch(hideConfirmationDialog());
  };

  // Get icon based on type
  const getIcon = (type, size = '3rem') => {
    const iconStyle = {
      fontSize: size,
    };

    switch (type) {
      case 'success':
        return <CheckCircle sx={{ ...iconStyle, color: themeColors.success }} />;
      case 'error':
        return <ErrorIcon sx={{ ...iconStyle, color: themeColors.error }} />;
      case 'warning':
        return <Warning sx={{ ...iconStyle, color: themeColors.warning }} />;
      case 'loading':
        return <CircularProgress size={56} sx={{ color: themeColors.secondary }} />;
      default:
        return <Info sx={{ ...iconStyle, color: themeColors.secondary }} />;
    }
  };

  // Get title text based on type
  const getNotificationTitle = (type) => {
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      case 'loading':
        return 'Loading';
      default:
        return 'Notification';
    }
  };

  // Get background gradient based on type
  const getHeaderGradient = (type) => {
    switch (type) {
      case 'success':
        return `linear-gradient(135deg, ${themeColors.success}15 0%, ${themeColors.success}08 100%)`;
      case 'error':
        return `linear-gradient(135deg, ${themeColors.error}15 0%, ${themeColors.error}08 100%)`;
      case 'warning':
        return `linear-gradient(135deg, ${themeColors.warning}15 0%, ${themeColors.warning}08 100%)`;
      default:
        return `linear-gradient(135deg, ${themeColors.secondary}15 0%, ${themeColors.primary}08 100%)`;
    }
  };

  // Get border/button color based on type
  const getDialogColor = (type) => {
    switch (type) {
      case 'success':
        return themeColors.success;
      case 'error':
        return themeColors.error;
      case 'warning':
        return themeColors.warning;
      default:
        return themeColors.secondary;
    }
  };

  // Auto-close notification after duration
  React.useEffect(() => {
    if (notification.open && notification.duration > 0 && notification.type !== 'loading') {
      const timer = setTimeout(() => {
        handleNotificationClose();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.open, notification.duration, notification.type]);

  return (
    <>
      {/* Notification Dialog */}
      <Dialog
        open={notification.open}
        onClose={handleNotificationClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 0,
          sx: {
            borderRadius: '24px',
            overflow: 'hidden',
            backgroundColor: themeColors.bgCard,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            minWidth: { xs: '320px', sm: '400px' },
            maxWidth: { xs: '90vw', sm: '480px' },
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          },
        }}
      >
        {/* Header Section */}
        <Box
          sx={{
            background: getHeaderGradient(notification.type),
            padding: { xs: 2.5, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
            position: 'relative',
          }}
        >
          {/* Close Button */}
          <IconButton
            onClick={handleNotificationClose}
            size="small"
            sx={{
              position: 'absolute',
              top: { xs: 12, sm: 16 },
              right: { xs: 12, sm: 16 },
              color: themeColors.textSecondary,
              backgroundColor: themeColors.bgCard,
              '&:hover': {
                backgroundColor: themeColors.bgSecondary,
                color: themeColors.text,
              },
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Close fontSize="small" />
          </IconButton>

          {/* Large Icon */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {getIcon(notification.type, '3.5rem')}
          </Box>

          {/* Title */}
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              color: themeColors.text,
              textAlign: 'center',
            }}
          >
            {getNotificationTitle(notification.type)}
          </Typography>
        </Box>

        {/* Content Section */}
        <DialogContent
          sx={{
            padding: { xs: 2.5, sm: 3 },
            paddingTop: { xs: 2, sm: 2.5 },
            textAlign: 'center',
          }}
        >
          {notification.type === 'loading' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Typography
                variant="body1"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 400,
                  fontSize: { xs: '0.9375rem', sm: '1rem' },
                  color: themeColors.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                Please wait...
              </Typography>
            </Box>
          ) : (
            <Typography
              variant="body1"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 400,
                fontSize: { xs: '0.9375rem', sm: '1rem' },
                color: themeColors.text,
                lineHeight: 1.7,
              }}
            >
              {notification.message}
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmationDialog.open}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 0,
          sx: {
            borderRadius: '24px',
            overflow: 'hidden',
            backgroundColor: themeColors.bgCard,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            minWidth: { xs: '320px', sm: '420px' },
            maxWidth: { xs: '90vw', sm: '500px' },
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          },
        }}
      >
        {/* Header Section */}
        <Box
          sx={{
            background: getHeaderGradient(confirmationDialog.type),
            padding: { xs: 2.5, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
            position: 'relative',
          }}
        >
          {/* Large Icon */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {getIcon(confirmationDialog.type, '3.5rem')}
          </Box>

          {/* Title */}
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              color: themeColors.text,
              textAlign: 'center',
            }}
          >
            {confirmationDialog.title}
          </Typography>
        </Box>

        {/* Content Section */}
        <DialogContent
          sx={{
            padding: { xs: 2.5, sm: 3 },
            paddingTop: { xs: 2, sm: 2.5 },
            textAlign: 'center',
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '0.9375rem', sm: '1rem' },
              color: themeColors.text,
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            {confirmationDialog.message}
          </Typography>
        </DialogContent>

        {/* Actions Section */}
        <DialogActions
          sx={{
            justifyContent: 'center',
            gap: 1.5,
            padding: { xs: 2, sm: 2.5 },
            paddingTop: { xs: 1.5, sm: 2 },
            backgroundColor: 'transparent',
          }}
        >
          <Button
            onClick={handleCancel}
            variant="outlined"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              fontSize: { xs: '0.875rem', sm: '0.9375rem' },
              padding: { xs: '10px 24px', sm: '12px 32px' },
              borderRadius: '12px',
              textTransform: 'none',
              borderWidth: '2px',
              borderColor: themeColors.border,
              color: themeColors.text,
              minWidth: { xs: '100px', sm: '120px' },
              '&:hover': {
                borderWidth: '2px',
                borderColor: themeColors.textSecondary,
                backgroundColor: themeColors.bgSecondary,
              },
            }}
          >
            {confirmationDialog.cancelText || 'Cancel'}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              fontSize: { xs: '0.875rem', sm: '0.9375rem' },
              padding: { xs: '10px 24px', sm: '12px 32px' },
              borderRadius: '12px',
              textTransform: 'none',
              backgroundColor: getDialogColor(confirmationDialog.type),
              color: themeColors.textInverse,
              minWidth: { xs: '100px', sm: '120px' },
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              '&:hover': {
                backgroundColor: getDialogColor(confirmationDialog.type),
                opacity: 0.9,
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
              },
            }}
          >
            {confirmationDialog.confirmText || 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ContactSupportCustomDialog;
