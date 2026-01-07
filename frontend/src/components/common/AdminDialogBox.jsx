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
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  Close,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { hideNotification, hideConfirmationDialog } from '../../store/slices/uiSlice';

/**
 * AdminDialogBox Component
 * 
 * Professional dialog box for admin users
 * Clean, minimalist design without child-friendly elements
 */
const AdminDialogBox = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
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
  const getIcon = (type) => {
    const iconStyle = {
      fontSize: '1.5rem',
    };

    switch (type) {
      case 'success':
        return <CheckCircle sx={{ ...iconStyle, color: theme.palette.success.main }} />;
      case 'error':
        return <ErrorIcon sx={{ ...iconStyle, color: theme.palette.error.main }} />;
      case 'warning':
        return <Warning sx={{ ...iconStyle, color: theme.palette.warning.main }} />;
      case 'loading':
        return <CircularProgress size={24} sx={{ color: theme.palette.primary.main }} />;
      default:
        return <Info sx={{ ...iconStyle, color: theme.palette.info.main }} />;
    }
  };

  // Get dialog color based on type
  const getDialogColor = (type) => {
    switch (type) {
      case 'success':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      default:
        return theme.palette.primary.main;
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
        maxWidth="xs"
        fullWidth
        PaperProps={{
          elevation: 8,
          sx: {
            borderRadius: '8px',
            padding: 0,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: 2,
            borderBottom: `1px solid ${theme.palette.border.main}`,
            backgroundColor: theme.palette.custom.bgSecondary,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
            {getIcon(notification.type)}
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: theme.palette.text.primary,
              }}
            >
              {notification.type === 'success' && 'Success'}
              {notification.type === 'error' && 'Error'}
              {notification.type === 'warning' && 'Warning'}
              {notification.type === 'info' && 'Information'}
              {notification.type === 'loading' && 'Loading'}
            </Typography>
          </Box>
          <IconButton
            onClick={handleNotificationClose}
            size="small"
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: theme.palette.custom.bgTertiary,
              },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ padding: 2.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '0.875rem',
              color: theme.palette.text.primary,
              lineHeight: 1.6,
            }}
          >
            {notification.message}
          </Typography>
        </DialogContent>

        {notification.type === 'loading' && (
          <DialogActions sx={{ justifyContent: 'center', padding: 2, paddingTop: 0 }}>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '0.75rem',
                color: theme.palette.text.secondary,
              }}
            >
              Please wait...
            </Typography>
          </DialogActions>
        )}
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmationDialog.open}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 8,
          sx: {
            borderRadius: '8px',
            padding: 0,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            fontSize: '1.125rem',
            color: theme.palette.text.primary,
            padding: 2.5,
            paddingBottom: 2,
            borderBottom: `1px solid ${theme.palette.border.main}`,
            backgroundColor: theme.palette.custom.bgSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {getIcon(confirmationDialog.type)}
          {confirmationDialog.title}
        </DialogTitle>

        <DialogContent sx={{ padding: 2.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '0.875rem',
              color: theme.palette.text.primary,
              lineHeight: 1.6,
            }}
          >
            {confirmationDialog.message}
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            justifyContent: 'flex-end',
            gap: 1,
            padding: 2.5,
            paddingTop: 2,
            borderTop: `1px solid ${theme.palette.border.main}`,
            backgroundColor: theme.palette.custom.bgSecondary,
          }}
        >
          <Button
            onClick={handleCancel}
            variant="outlined"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 500,
              fontSize: '0.875rem',
              padding: '8px 20px',
              borderRadius: '6px',
              textTransform: 'none',
              borderColor: theme.palette.border.main,
              color: theme.palette.text.primary,
              '&:hover': {
                borderColor: theme.palette.text.secondary,
                backgroundColor: theme.palette.custom.bgTertiary,
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
              fontWeight: 500,
              fontSize: '0.875rem',
              padding: '8px 20px',
              borderRadius: '6px',
              textTransform: 'none',
              backgroundColor: getDialogColor(confirmationDialog.type),
              color: theme.palette.textCustom.inverse,
              '&:hover': {
                backgroundColor: getDialogColor(confirmationDialog.type),
                opacity: 0.9,
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

export default AdminDialogBox;

