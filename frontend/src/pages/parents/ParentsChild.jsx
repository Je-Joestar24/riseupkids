import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Card, CardContent, Link } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LockIcon from '@mui/icons-material/Lock';
import SettingsIcon from '@mui/icons-material/Settings';
import AuthLogo from '../../components/auth/AuthLogo';
import ParentsChildList from '../../components/parents/child/ParentsChildList';
import ParentsChildAddButton from '../../components/parents/child/ParentsChildAddButton';
import ParentChildAddModal from '../../components/parents/child/ParentChildAddModal';
import useAuth from '../../hooks/userHook';
import useChildren from '../../hooks/childrenHook';
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
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { children, fetchChildren, loading } = useChildren();
  const [addModalOpen, setAddModalOpen] = useState(false);

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

  // Fetch children on component mount
  useEffect(() => {
    if (isAuthenticated && user?.role === 'parent') {
      fetchChildren({ isActive: true });
    }
  }, [isAuthenticated, user]);

  const handleSelectChild = (child) => {
    // TODO: Set selected child and navigate to child dashboard
    // Navigate to child dashboard when ready
    // navigate(`/child/${child._id}/dashboard`);
  };

  const handleAddNewChild = () => {
    setAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setAddModalOpen(false);
    // Refresh children list after adding
    fetchChildren({ isActive: true });
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
              {loading && children.length === 0 ? (
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '1rem',
                    color: themeColors.textSecondary,
                    textAlign: 'center',
                    padding: 3,
                  }}
                >
                  Loading children...
                </Typography>
              ) : children.length === 0 ? (
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '1rem',
                    color: themeColors.textSecondary,
                    textAlign: 'center',
                    padding: 3,
                  }}
                >
                  No children found. Add your first child!
                </Typography>
              ) : (
                <ParentsChildList
                  children={children}
                  onSelectChild={handleSelectChild}
                />
              )}
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

      {/* Add Child Modal */}
      <ParentChildAddModal
        open={addModalOpen}
        onClose={handleCloseAddModal}
      />
    </Box>
  );
};

export default ParentsChild;

