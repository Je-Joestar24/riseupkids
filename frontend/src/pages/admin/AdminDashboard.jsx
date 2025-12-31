import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * AdminDashboard Page
 * 
 * Main dashboard page for admin
 * Placeholder content for now
 */
const AdminDashboard = () => {
  const theme = useTheme();

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '1.75rem',
          color: theme.palette.text.primary,
          marginBottom: 3,
        }}
      >
        Dashboard
      </Typography>

      <Paper
        sx={{
          padding: 3,
          borderRadius: '0px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
          }}
        >
          Welcome to the Admin Dashboard. Content coming soon...
        </Typography>
      </Paper>
    </Box>
  );
};

export default AdminDashboard;

