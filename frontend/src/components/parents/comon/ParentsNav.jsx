import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Container,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  Settings,
  ArrowBack,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import smallLogo from '../../../assets/images/small-logo.png';
import { themeColors } from '../../../config/themeColors';
import useAuth from '../../../hooks/userHook';

/**
 * ParentsNav Component
 * 
 * Enhanced navigation bar for parent dashboard
 * Shows logo on right and profile menu with switch to child view option
 */
const ParentsNav = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    try {
      await logout();
      // Navigation is handled by the logout function in useAuth hook
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, navigate to login
      navigate('/login');
    }
  };

  const handleSettings = () => {
    handleProfileMenuClose();
    // TODO: Navigate to settings page when implemented
    console.log('Account Settings - Coming soon');
  };

  const handleSwitchToChildView = () => {
    handleProfileMenuClose();
    // Clear dashboard password verification
    sessionStorage.removeItem('dashboardPasswordVerified');
    navigate('/parents/child');
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: themeColors.bgCard,
        color: themeColors.text,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        borderBottom: `1px solid ${themeColors.border}`,
        zIndex: theme.zIndex.drawer + 1,
        borderRadius: '0px',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ paddingX: { xs: 2, sm: 3 }, minHeight: '72px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Left Side - Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={smallLogo}
              alt="Rise Up Kids"
              style={{ height: '36px', width: 'auto' }}
            />
          </Box>

          {/* Right Side - Profile */}
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
                backgroundColor: themeColors.bgTertiary,
                transform: 'translateY(-1px)',
              },
            }}
            onClick={handleProfileMenuOpen}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                background: `linear-gradient(135deg, ${themeColors.secondary} 0%, ${themeColors.primary} 100%)`,
                fontSize: '1rem',
                boxShadow: `0 2px 6px ${themeColors.secondary}40`,
              }}
            >
              <AccountCircle />
            </Avatar>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                color: themeColors.text,
                fontSize: '0.875rem',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              {user?.name || 'Parent'}
            </Typography>
            <Box
              component="span"
              sx={{
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: `5px solid ${themeColors.textSecondary}`,
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
                border: `1px solid ${themeColors.border}`,
                overflow: 'hidden',
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box
              sx={{
                padding: 2,
                backgroundColor: themeColors.bgSecondary,
                borderBottom: `1px solid ${themeColors.border}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  color: themeColors.text,
                  marginBottom: 0.5,
                }}
              >
                {user?.name || 'Parent'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: themeColors.textSecondary,
                  fontSize: '0.75rem',
                }}
              >
                {user?.email || 'parent@example.com'}
              </Typography>
            </Box>
            <Box sx={{ padding: 0.5 }}>
              <MenuItem
                onClick={handleSwitchToChildView}
                sx={{
                  padding: 1.5,
                  borderRadius: '8px',
                  margin: 0.5,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: themeColors.bgTertiary,
                    transform: 'translateX(4px)',
                    '& .MuiSvgIcon-root': {
                      color: themeColors.secondary,
                    },
                    '& .MuiTypography-root': {
                      color: themeColors.secondary,
                    },
                  },
                }}
              >
                <ArrowBack
                  sx={{
                    marginRight: 1.5,
                    fontSize: '1.25rem',
                    color: themeColors.textSecondary,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 500,
                    color: themeColors.text,
                  }}
                >
                  Switch to Child View
                </Typography>
              </MenuItem>
              <MenuItem
                onClick={handleSettings}
                sx={{
                  padding: 1.5,
                  borderRadius: '8px',
                  margin: 0.5,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: themeColors.bgTertiary,
                    transform: 'translateX(4px)',
                    '& .MuiSvgIcon-root': {
                      color: themeColors.secondary,
                    },
                    '& .MuiTypography-root': {
                      color: themeColors.secondary,
                    },
                  },
                }}
              >
                <Settings
                  sx={{
                    marginRight: 1.5,
                    fontSize: '1.25rem',
                    color: themeColors.textSecondary,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 500,
                    color: themeColors.text,
                  }}
                >
                  Account Settings
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
                    backgroundColor: `${themeColors.error}20`,
                    transform: 'translateX(4px)',
                    '& .MuiSvgIcon-root': {
                      color: themeColors.error,
                    },
                    '& .MuiTypography-root': {
                      color: themeColors.error,
                    },
                  },
                }}
              >
                <Logout
                  sx={{
                    marginRight: 1.5,
                    fontSize: '1.25rem',
                    color: themeColors.textSecondary,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 500,
                    color: themeColors.text,
                  }}
                >
                  Logout
                </Typography>
              </MenuItem>
            </Box>
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default ParentsNav;
