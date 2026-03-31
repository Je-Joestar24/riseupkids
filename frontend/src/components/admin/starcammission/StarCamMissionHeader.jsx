import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const StarCamMissionHeader = () => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 3,
        mb: 2,
        borderRadius: '16px',
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[2],
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
        <AutoAwesomeIcon sx={{ color: theme.palette.accent.main }} />
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: { xs: '1.35rem', md: '1.75rem' },
          }}
        >
          Star Cam Missions
        </Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          mt: 1,
          color: theme.palette.text.secondary,
          fontFamily: 'Quicksand, sans-serif',
        }}
      >
        Manage mission categories and mission definitions for Star Cam.
      </Typography>
    </Paper>
  );
};

export default StarCamMissionHeader;

