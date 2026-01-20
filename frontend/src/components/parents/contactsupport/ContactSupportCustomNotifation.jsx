import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
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
import { hideNotification } from '../../../store/slices/uiSlice';
import { themeColors } from '../../../config/themeColors';

/**
 * ContactSupportCustomNotification Component
 * 
 * Minimalist, professional notification dialog for parents
 * Follows parent theme colors from themeColors.js
 * Clean design without child-friendly elements
 */
const ContactSupportCustomNotification = () => {
  const dispatch = useDispatch();
  const { notification } = useSelector((state) => state.ui);

  // Handle notification close
  const handleNotificationClose = () => {
    dispatch(hideNotification());
  };

  // Get icon based on type
  const getIcon = (type) => {
    const iconStyle = {
      fontSize: '1.5rem',
    };

    switch (type) {
      case 'success':
        return <CheckCircle sx={{ ...iconStyle, color: themeColors.success }} />;
      case 'error':
        return <ErrorIcon sx={{ ...iconStyle, color: themeColors.error }} />;
      case 'warning':
        return <Warning sx={{ ...iconStyle, color: themeColors.warning }} />;
      case 'loading':
        return <CircularProgress size={24} sx={{ color: themeColors.secondary }} />;
      default:
        return <Info sx={{ ...iconStyle, color: themeColors.secondary }} />;
    }
  };

  // Get border color based on type
  const getBorderColor = (type) => {
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

  if (!notification.open) {
    return null;
  }

  return (
    <Dialog
      open={notification.open}
      onClose={handleNotificationClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          border: `2px solid ${getBorderColor(notification.type)}`,
          backgroundColor: themeColors.bgCard,
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: { xs: 1.5, sm: 2 },
          backgroundColor: 'transparent',
          position: 'relative',
        }}
      >
        {/* Icon and Message */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          {getIcon(notification.type)}
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              fontSize: { xs: '0.9375rem', sm: '1rem' },
              color: themeColors.text,
              lineHeight: 1.5,
            }}
          >
            {notification.message}
          </Typography>
        </Box>

        {/* Close Button */}
        <IconButton
          onClick={handleNotificationClose}
          size="small"
          sx={{
            color: themeColors.textSecondary,
            padding: 0.5,
            '&:hover': {
              backgroundColor: themeColors.bgSecondary,
              color: themeColors.text,
            },
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {notification.type === 'loading' && (
        <Box sx={{ paddingX: { xs: 1.5, sm: 2 }, paddingBottom: 1.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '0.75rem',
              color: themeColors.textSecondary,
              display: 'block',
              textAlign: 'center',
            }}
          >
            Please wait...
          </Typography>
        </Box>
      )}
    </Dialog>
  );
};

export default ContactSupportCustomNotification;
