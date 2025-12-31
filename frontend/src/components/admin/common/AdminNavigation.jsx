import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  AccountCircle,
  Logout,
  Settings,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useAuth from '../../../hooks/userHook';
import smallLogo from '../../../assets/images/small-logo.png';

/**
 * AdminNavigation Component
 * 
 * Top navigation bar for admin panel
 * Includes logo, notifications, and admin profile menu
 */
const AdminNavigation = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
  };

  const handleSettings = () => {
    handleProfileMenuClose();
    // TODO: Navigate to settings
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        borderBottom: `1px solid ${theme.palette.border.main}`,
        zIndex: theme.zIndex.drawer + 1,
        borderRadius: '0px',
        paddingX: '5px'
      }}
    >
      <Toolbar sx={{ paddingX: 3, minHeight: '64px !important' }}>
        {/* Logo and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 0 }}>
          <img
            src={smallLogo}
            alt="Rise Up Kids"
            style={{ height: '32px', width: 'auto' }}
          />
          <Box
            sx={{
              backgroundColor: theme.palette.orange.main,
              color: 'white',
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Admin Panel
          </Box>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right Side Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <IconButton
            onClick={handleNotificationMenuOpen}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: theme.palette.custom.bgTertiary,
              },
            }}
          >
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Notifications Menu */}
          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={handleNotificationMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 300,
                maxHeight: 400,
                borderRadius: '0px',
                boxShadow: theme.shadows[4],
              },
            }}
          >
            <MenuItem disabled>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Notifications
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleNotificationMenuClose}>
              <Typography variant="body2">No new notifications</Typography>
            </MenuItem>
          </Menu>

          {/* Admin Profile */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: theme.palette.custom.bgTertiary,
              },
            }}
            onClick={handleProfileMenuOpen}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                backgroundColor: theme.palette.orange.main,
                fontSize: '0.875rem',
              }}
            >
              <AccountCircle />
            </Avatar>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 500,
                color: theme.palette.text.primary,
                fontSize: '0.875rem',
              }}
            >
              {user?.name || 'Admin'}
            </Typography>
            <Box
              component="span"
              sx={{
                width: 0,
                height: 0,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: `4px solid ${theme.palette.text.secondary}`,
                marginLeft: 0.5,
              }}
            />
          </Box>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 200,
                borderRadius: '0px',
                boxShadow: theme.shadows[4],
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {user?.email || 'admin@example.com'}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleSettings}>
              <Settings sx={{ marginRight: 1, fontSize: '1.25rem' }} />
              <Typography variant="body2">Settings</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ marginRight: 1, fontSize: '1.25rem' }} />
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AdminNavigation;

