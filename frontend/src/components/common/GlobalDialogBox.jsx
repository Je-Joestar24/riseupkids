import React from 'react';
import { useSelector } from 'react-redux';
import AdminDialogBox from './AdminDialogBox';
import ChildDialogBox from './ChildDialogBox';

/**
 * GlobalDialogBox Component
 * 
 * Routes to appropriate dialog box based on user role
 * Admin users get professional dialogs, children get child-friendly dialogs
 * Parents have their own dialog box in ParentsLayout
 */
const GlobalDialogBox = () => {
  const { user } = useSelector((state) => state.user);
  
  // Determine user role
  const isAdmin = user?.role === 'admin';
  const isParent = user?.role === 'parent';

  // Parents have their own dialog box in ParentsLayout, so return null here
  if (isParent) {
    return null;
  }

  // Render appropriate dialog box based on user role
  if (isAdmin) {
    return <AdminDialogBox />;
  }

  // Default to child-friendly dialog for non-admin, non-parent users
  return <ChildDialogBox />;

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
      fontSize: '3rem', // Big font for children
      marginBottom: '1rem',
    };

    switch (type) {
      case 'success':
        return <CheckCircle sx={{ ...iconStyle, color: themeColors.success }} />;
      case 'error':
        return <ErrorIcon sx={{ ...iconStyle, color: themeColors.error }} />;
      case 'warning':
        return <Warning sx={{ ...iconStyle, color: themeColors.warning }} />;
      case 'loading':
        return <CircularProgress size={60} sx={{ marginBottom: '1rem', color: themeColors.primary }} />;
      default:
        return <Info sx={{ ...iconStyle, color: themeColors.primary }} />;
    }
  };

  // Get dialog color based on type
  const getDialogColor = (type) => {
    switch (type) {
      case 'success':
        return themeColors.success;
      case 'error':
        return themeColors.error;
      case 'warning':
        return themeColors.warning;
      default:
        return themeColors.primary;
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
          sx: {
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', position: 'absolute', right: 8, top: 8 }}>
          <IconButton
            onClick={handleNotificationClose}
            size="small"
            sx={{ color: themeColors.textSecondary }}
          >
            <Close />
          </IconButton>
        </Box>

        <DialogContent sx={{ paddingTop: '2rem !important', textAlign: 'center' }}>
          {getIcon(notification.type)}
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              fontSize: '1.5rem', // Big font for children
              color: themeColors.text,
              marginTop: '1rem',
            }}
          >
            {notification.message}
          </Typography>
        </DialogContent>

        {notification.type === 'loading' && (
          <DialogActions sx={{ justifyContent: 'center', paddingBottom: '1rem' }}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '1rem',
                color: themeColors.textSecondary,
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
          sx: {
            borderRadius: '16px',
            padding: '24px',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.75rem', // Big font for children
            color: getDialogColor(confirmationDialog.type),
            paddingBottom: '1rem',
            textAlign: 'center',
          }}
        >
          {confirmationDialog.title}
        </DialogTitle>

        <DialogContent>
          <Box sx={{ textAlign: 'center', marginBottom: '1rem' }}>
            {getIcon(confirmationDialog.type)}
          </Box>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '1.25rem', // Big font for children
              color: themeColors.text,
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            {confirmationDialog.message}
          </Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', gap: '1rem', padding: '1.5rem' }}>
          <Button
            onClick={handleCancel}
            variant="outlined"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              fontSize: '1.125rem', // Big font for children
              padding: '12px 32px',
              borderRadius: '8px',
              textTransform: 'none',
              borderColor: themeColors.border,
              color: themeColors.text,
              '&:hover': {
                borderColor: themeColors.textSecondary,
                backgroundColor: themeColors.bgTertiary,
              },
            }}
          >
            {confirmationDialog.cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              fontSize: '1.125rem', // Big font for children
              padding: '12px 32px',
              borderRadius: '8px',
              textTransform: 'none',
              backgroundColor: getDialogColor(confirmationDialog.type),
              color: themeColors.textInverse,
              '&:hover': {
                backgroundColor: getDialogColor(confirmationDialog.type),
                opacity: 0.9,
              },
            }}
          >
            {confirmationDialog.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GlobalDialogBox;

