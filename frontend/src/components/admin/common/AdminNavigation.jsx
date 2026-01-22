import React, { useState, useCallback } from 'react';
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
  Person,
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
const AdminNavigation = ({ profileDrawerOpen, setProfileDrawerOpen }) => {
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

  const handleProfile = useCallback(() => {
    handleProfileMenuClose();
    setProfileDrawerOpen(true);
  }, [setProfileDrawerOpen]);

  return (
<>
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        borderBottom: `1px solid ${theme.palette.border.main}`,
        zIndex: 1100,
        borderRadius: '0px',
      }}
    >
      <Toolbar sx={{ paddingX: 3, minHeight: '72px !important' }}>
        {/* Logo and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 0 }}>
          <img
            src={smallLogo}
            alt="Rise Up Kids"
            style={{ height: '36px', width: 'auto' }}
          />
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.orange.main} 0%, ${theme.palette.orange.dark} 100%)`,
              color: theme.palette.textCustom.inverse,
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: 'Quicksand, sans-serif',
              letterSpacing: '0.5px',
              boxShadow: `0 2px 6px ${theme.palette.orange.main}40`,
            }}
          >
            Admin Panel
          </Box>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right Side Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Notifications */}
          <IconButton
            onClick={handleNotificationMenuOpen}
            sx={{
              color: theme.palette.text.secondary,
              padding: 1.25,
              borderRadius: '10px',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: theme.palette.custom.bgTertiary,
                color: theme.palette.text.primary,
                transform: 'scale(1.05)',
              },
            }}
          >
            <Badge 
              badgeContent={3} 
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.625rem',
                  height: '18px',
                  minWidth: '18px',
                  padding: '0 4px',
                },
              }}
            >
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
                mt: 2,
                minWidth: 360,
                maxHeight: 480,
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                border: `1px solid ${theme.palette.border.main}`,
                overflow: 'hidden',
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box
              sx={{
                padding: 2,
                backgroundColor: theme.palette.custom.bgSecondary,
                borderBottom: `1px solid ${theme.palette.border.main}`,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: theme.palette.text.primary,
                }}
              >
                Notifications
              </Typography>
            </Box>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <MenuItem
                onClick={handleNotificationMenuClose}
                sx={{
                  padding: 2,
                  '&:hover': {
                    backgroundColor: theme.palette.custom.bgTertiary,
                  },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    color: theme.palette.text.secondary,
                  }}
                >
                  No new notifications
                </Typography>
              </MenuItem>
            </Box>
          </Menu>

          {/* Admin Profile */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: theme.palette.custom.bgTertiary,
                transform: 'translateY(-1px)',
              },
            }}
            onClick={handleProfileMenuOpen}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                background: `linear-gradient(135deg, ${theme.palette.orange.main} 0%, ${theme.palette.orange.dark} 100%)`,
                fontSize: '1rem',
                boxShadow: `0 2px 6px ${theme.palette.orange.main}40`,
              }}
            >
              <AccountCircle />
            </Avatar>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
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
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: `5px solid ${theme.palette.text.secondary}`,
                marginLeft: 0.5,
                transition: 'transform 0.2s ease',
                transform: anchorEl ? 'rotate(180deg)' : 'rotate(0deg)',
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
                mt: 1.5,
                minWidth: 240,
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                border: `1px solid ${theme.palette.border.main}`,
                overflow: 'hidden',
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box
              sx={{
                padding: 2,
                backgroundColor: theme.palette.custom.bgSecondary,
                borderBottom: `1px solid ${theme.palette.border.main}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  color: theme.palette.text.primary,
                  marginBottom: 0.5,
                }}
              >
                {user?.name || 'Admin'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: theme.palette.text.secondary,
                  fontSize: '0.75rem',
                }}
              >
                {user?.email || 'admin@example.com'}
              </Typography>
            </Box>
            <Box sx={{ padding: 0.5 }}>
              <MenuItem
                onClick={handleProfile}
                sx={{
                  padding: 1.5,
                  borderRadius: '8px',
                  margin: 0.5,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: theme.palette.custom.bgTertiary,
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <Person
                  sx={{
                    marginRight: 1.5,
                    fontSize: '1.25rem',
                    color: theme.palette.text.secondary,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 500,
                    color: theme.palette.text.primary,
                  }}
                >
                  Profile
                </Typography>
              </MenuItem>
              <MenuItem
                onClick={handleLogout}
                sx={{
                  padding: 1.5,
                  borderRadius: '8px',
                  margin: 0.5,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: theme.palette.error.light + '20',
                    transform: 'translateX(4px)',
                    '& .MuiSvgIcon-root': {
                      color: theme.palette.error.main,
                    },
                    '& .MuiTypography-root': {
                      color: theme.palette.error.main,
                    },
                  },
                }}
              >
                <Logout
                  sx={{
                    marginRight: 1.5,
                    fontSize: '1.25rem',
                    color: theme.palette.text.secondary,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 500,
                    color: theme.palette.text.primary,
                  }}
                >
                  Logout
                </Typography>
              </MenuItem>
            </Box>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
    </>
  );
};

export default AdminNavigation;

