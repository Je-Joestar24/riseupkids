import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Grid } from '@mui/material';
import { themeColors } from '../../config/themeColors';
import useAuth from '../../hooks/userHook';
import useChildren from '../../hooks/childrenHook';
import DashboardHeader from '../../components/parents/dashboard/DashboardHeader';
import TotalChildStars from '../../components/parents/dashboard/TotalChildStars';
import ChildListProgress from '../../components/parents/dashboard/ChildListProgress';
import AccountSettingsBox from '../../components/parents/dashboard/AccountSettingsBox';
import SupportProjectTeam from '../../components/parents/dashboard/SupportProjectTeam';
import AccountSettingsModal from '../../components/parents/settings/AccountSettingsModal';
import PeopleIcon from '@mui/icons-material/People';
import { Card, CardContent, Typography } from '@mui/material';

/**
 * ParentDashboard Page
 * 
 * Main dashboard page for parents
 * Shows overview of children, progress, and settings
 * Requires password verification to access (handled by route guard)
 * Fully mobile responsive
 */
const ParentDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { children, fetchChildren, loading } = useChildren();
  const [openSettings, setOpenSettings] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated && user?.role === 'parent') {
      fetchChildren({ isActive: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role]);

  const handleSwitchToChildView = () => {
    // Clear dashboard password verification
    sessionStorage.removeItem('dashboardPasswordVerified');
    navigate('/parents/child');
  };

  const handleSelectChild = (childId) => {
    // Clear dashboard password verification when switching to child view
    sessionStorage.removeItem('dashboardPasswordVerified');
    navigate(`/child/${childId}/home`);
  };

  const handleViewProgress = (childId) => {
    // Placeholder for View Child Progress functionality
    console.log('View progress for child:', childId);
    // TODO: Navigate to child progress page when implemented
  };

  const handleOpenSettings = () => {
    setOpenSettings(true);
  };

  const handleSupportClick = () => {
    // Placeholder for Support functionality
    console.log('Open support');
    // TODO: Navigate to support page when implemented
  };

  if (!isAuthenticated || !user || user.role !== 'parent') {
    return null;
  }

  // Calculate total stars from children data
  const totalStars = children.reduce((sum, child) => {
    return sum + (child.stats?.totalStars || 0);
  }, 0);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: themeColors.bg,
        paddingTop: { xs: 2, sm: 3, md: 4 },
        paddingBottom: { xs: 4, sm: 6, md: 8 },
        paddingX: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="lg" sx={{ paddingX: { xs: 0, sm: 2 } }}>
        {/* Header */}
        <DashboardHeader
          userName={user.name}
          onSwitchToChildView={handleSwitchToChildView}
        />

        {/* Quick Stats Grid */}
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ marginBottom: { xs: 3, sm: 4 } }}>
          {/* Children Count Card */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                borderRadius: { xs: '16px', sm: '20px' },
                backgroundColor: themeColors.bgCard,
                border: `1px solid ${themeColors.border}`,
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ padding: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, marginBottom: 2 }}>
                  <PeopleIcon
                    sx={{
                      fontSize: { xs: '2rem', sm: '2.5rem' },
                      color: themeColors.secondary,
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontSize: { xs: '1rem', sm: '1.25rem' },
                      fontWeight: 700,
                      color: themeColors.text,
                    }}
                  >
                    Children
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                    fontWeight: 700,
                    color: themeColors.secondary,
                  }}
                >
                  {loading ? '...' : children.length}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    color: themeColors.textSecondary,
                  }}
                >
                  Active profiles
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Stars Card */}
          <Grid item xs={12} sm={6} md={3}>
            <TotalChildStars totalStars={totalStars} loading={loading} />
          </Grid>

          {/* Account Settings Card */}
          <Grid item xs={12} sm={6} md={3}>
            <AccountSettingsBox onOpenSettings={handleOpenSettings} />
          </Grid>

          {/* Support Card */}
          <Grid item xs={12} sm={6} md={3}>
            <SupportProjectTeam onSupportClick={handleSupportClick} />
          </Grid>
        </Grid>

        {/* Children List with Progress */}
        <ChildListProgress
          children={children}
          loading={loading}
          onSelectChild={handleSelectChild}
          onViewProgress={handleViewProgress}
        />
      </Container>

      {/* Account Settings Modal */}
      <AccountSettingsModal open={openSettings} onClose={() => setOpenSettings(false)} />
    </Box>
  );
};

export default ParentDashboard;
