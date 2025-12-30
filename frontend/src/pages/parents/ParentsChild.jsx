import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Card, CardContent, Link } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LockIcon from '@mui/icons-material/Lock';
import SettingsIcon from '@mui/icons-material/Settings';
import AuthLogo from '../../components/auth/AuthLogo';
import ParentsChildList from '../../components/parents/child/ParentsChildList';
import ParentsChildAddButton from '../../components/parents/child/ParentsChildAddButton';
import useAuth from '../../hooks/userHook';
import { showNotification } from '../../store/slices/uiSlice';
import { useDispatch } from 'react-redux';
import { themeColors } from '../../config/themeColors';
import '../../assets/css/ParentsChild.css';

/**
 * ParentsChild Page
 * 
 * Child profile selection page for parents
 * Shows list of child profiles and option to add new child
 */
const ParentsChild = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const { user, childProfiles, isAuthenticated } = useAuth();

  // Redirect if not authenticated or not a parent
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'parent') {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  const handleSelectChild = (child) => {
    // TODO: Set selected child and navigate to child dashboard
    dispatch(showNotification({
      message: `Selected ${child.displayName}'s profile`,
      type: 'info',
    }));
    // Navigate to child dashboard when ready
    // navigate(`/child/${child._id}/dashboard`);
  };

  const handleAddNewChild = () => {
    // TODO: Open add child dialog/modal
    dispatch(showNotification({
      message: 'Add new child feature coming soon',
      type: 'info',
    }));
  };

  const handleParentLogin = () => {
    // Navigate to parent/teacher login (same login page)
    navigate('/login');
  };

  const handleSettings = () => {
    // TODO: Navigate to settings page
    dispatch(showNotification({
      message: 'Settings feature coming soon',
      type: 'info',
    }));
  };

  if (!isAuthenticated || !user || user.role !== 'parent') {
    return null;
  }

  return (
    <Box className="parents-child-page">
      <Container maxWidth="sm" className="parents-child-container">
        {/* Logo */}
        <AuthLogo />

        {/* Main Card */}
        <Card className="parents-child-card">
          <CardContent className="parents-child-card-content">
            {/* Header */}
            <Box className="parents-child-header">
              <Typography 
                className="parents-child-welcome" 
                sx={{
                  fontSize: '22px', 
                  fontWeight: '700', 
                  color: theme.palette.primary.main
                }}
              >
                Welcome Back! 👏
              </Typography>
              <Typography variant="body2" className="parents-child-subtitle">
                Pick your profile:
              </Typography>
            </Box>

            {/* Child List */}
            <Box className="parents-child-list-container">
              <ParentsChildList
                children={childProfiles || []}
                onSelectChild={handleSelectChild}
              />
            </Box>

            {/* Add New Kid Button */}
            <Box className="parents-child-add-container">
              <ParentsChildAddButton onClick={handleAddNewChild} />
            </Box>

            {/* Additional Links */}
            <Box className="parents-child-links">
              <Link
                onClick={handleParentLogin}
                className="parents-child-link"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  margin: 'auto',
                  opacity: '.8'
                }}
              >
                <LockIcon sx={{ fontSize: '1.25rem', color: themeColors.accent }} />
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: themeColors.textSecondary,
                  }}
                >
                  Parent Login
                </Typography>
              </Link>

              <Link
                onClick={handleSettings}
                className="parents-child-link"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  margin: 'auto'
                }}
              >
                <SettingsIcon sx={{ fontSize: '1.25rem', color: themeColors.textSecondary }} />
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: themeColors.textSecondary,
                  }}
                >
                  Settings
                </Typography>
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ParentsChild;

