import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  AssignmentOutlined,
  PlayCircleOutlined,
  AutoStoriesOutlined,
  AutoAwesomeOutlined,
} from '@mui/icons-material';

const ContentCreatorDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'My Contents',
      description: 'Activities, books, videos, audio, and chants you created.',
      icon: <AssignmentOutlined sx={{ fontSize: 34 }} />,
      path: '/content-creator/contents',
    },
    {
      title: 'Built-in Books',
      description: 'Build and publish CMS slide-deck books.',
      icon: <AutoStoriesOutlined sx={{ fontSize: 34 }} />,
      path: '/content-creator/built-in-books',
    },
    {
      title: 'Explore',
      description: 'Manage your explore videos and embeds.',
      icon: <PlayCircleOutlined sx={{ fontSize: 34 }} />,
      path: '/content-creator/explore',
    },
    {
      title: 'Star Cam Missions',
      description: 'Create and publish Star Cam missions.',
      icon: <AutoAwesomeOutlined sx={{ fontSize: 34 }} />,
      path: '/content-creator/star-cam-missions',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, mb: 1 }}>
        Dashboard
      </Typography>
      <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
        Create and manage your learning assets. Admins align published content into courses.
      </Typography>

      <Grid container spacing={2.5}>
        {quickActions.map((action) => (
          <Grid key={action.title} item xs={12} sm={6} md={3}>
            <Paper
              role="button"
              aria-label={`Go to ${action.title}`}
              tabIndex={0}
              onClick={() => navigate(action.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(action.path);
              }}
              sx={{
                p: 3,
                height: '100%',
                cursor: 'pointer',
                borderRadius: '16px',
                border: `1px solid ${theme.palette.border.main}`,
                '&:hover': { boxShadow: theme.shadows[4], transform: 'translateY(-2px)' },
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{ color: theme.palette.orange.main, mb: 2 }}>{action.icon}</Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {action.title}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {action.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ContentCreatorDashboard;
