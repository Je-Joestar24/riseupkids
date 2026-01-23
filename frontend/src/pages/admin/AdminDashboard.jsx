import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  PeopleOutlined,
  SchoolOutlined,
  MenuBookOutlined,
  PlayCircleOutlined,
  WallpaperOutlined,
} from '@mui/icons-material';
import DashboardList from '../../components/admin/dashboard/DashboardList';

/**
 * AdminDashboard Page
 *
 * Minimalist dashboard for admin users
 * Professional quick action cards for navigation
 */
const AdminDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Users',
      description: 'Manage parent accounts and user access.',
      icon: <PeopleOutlined sx={{ fontSize: 34 }} />,
      path: '/admin/users',
    },
    {
      title: 'Teachers',
      description: 'Manage teacher accounts and permissions.',
      icon: <SchoolOutlined sx={{ fontSize: 34 }} />,
      path: '/admin/teachers',
    },
    {
      title: 'Courses',
      description: 'Create and organize learning modules.',
      icon: <MenuBookOutlined sx={{ fontSize: 34 }} />,
      path: '/admin/courses',
    },
    {
      title: 'Kids Wall',
      description: 'Review and moderate Kids Wall posts.',
      icon: <WallpaperOutlined sx={{ fontSize: 34 }} />,
      path: '/admin/kids-wall',
    },
  ];

  return (
    <Box>
      <Grid container spacing={2.5}>
        {quickActions.map((action) => (
          <Grid key={action.title} item xs={12} sm={6} md={3}>
            <Paper
              role="button"
              aria-label={`Go to ${action.title}`}
              tabIndex={0}
              onClick={() => navigate(action.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(action.path);
                }
              }}
              sx={{
                padding: 2.5,
                borderRadius: '16px',
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.border.main}`,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                outline: 'none',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[4],
                },
                '&:focus-visible': {
                  boxShadow: `0 0 0 3px ${theme.palette.orange.main}33`,
                },
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '14px',
                  marginBottom: 2,
                  background: `linear-gradient(135deg, ${theme.palette.orange.main} 0%, ${theme.palette.orange.dark} 100%)`,
                  color: theme.palette.textCustom.inverse,
                  boxShadow: `0 6px 18px ${theme.palette.orange.main}33`,
                }}
              >
                {action.icon}
              </Box>

              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  fontSize: '1.05rem',
                  marginBottom: 0.5,
                }}
              >
                {action.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: theme.palette.text.secondary,
                  lineHeight: 1.5,
                }}
              >
                {action.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <DashboardList />
    </Box>
  );
};

export default AdminDashboard;
