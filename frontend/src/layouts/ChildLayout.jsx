import React, { useEffect } from 'react';
import { Box, Dialog, DialogContent, DialogActions, Typography, Button, CircularProgress, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle, Error as ErrorIcon, Warning, Info, Close } from '@mui/icons-material';
import ChildHeader from '../components/common/ChilHeader';
import ChildNavigation from '../components/common/ChildNavigation';
import { themeColors } from '../config/themeColors';
import { hideNotification } from '../store/slices/uiSlice';

/**
 * ChildLayout Component
 * 
 * Layout wrapper for child interface pages
 * Includes sticky header and fixed bottom navigation
 * Default background color uses theme primary color
 * Displays notifications that persist across page navigation
 */
const ChildLayout = ({ children, childId }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { notification } = useSelector((state) => state.ui);

  // Handle notification close
  const handleNotificationClose = () => {
    dispatch(hideNotification());
  };

  // Get icon based on type
  const getIcon = (type) => {
    const iconStyle = {
      fontSize: '3rem',
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

  // Auto-close notification after duration
  useEffect(() => {
    if (notification.open && notification.duration > 0 && notification.type !== 'loading') {
      const timer = setTimeout(() => {
        handleNotificationClose();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.open, notification.duration, notification.type]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: themeColors.primary, // #62caca - theme primary color
      }}
    >
      {/* Sticky Header */}
      <ChildHeader childId={childId} />

      {/* Scrollable Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflowY: 'auto',
          width: '100%',
          paddingBottom: '100px', // Space for fixed bottom navigation (68px height + 32px padding)
        }}
      >
        {children}
      </Box>

      {/* Fixed Bottom Navigation */}
      <ChildNavigation childId={childId} />

      {/* Notification Dialog - Persists Across Navigation */}
      <Dialog
        open={notification.open}
        onClose={handleNotificationClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 8,
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
              fontSize: notification.type === 'success' ? '1.75rem' : '1.5rem',
              color: notification.type === 'success' ? themeColors.success : themeColors.text,
              marginTop: '1rem',
              lineHeight: 1.4,
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
    </Box>
  );
};

export default ChildLayout;
