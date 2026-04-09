import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const StarCamMissionHeader = ({ selectedMission = null, totalMissions = 0, onClearSelection, onOpenCreateModal }) => {
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
      <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          Total missions: {Number(totalMissions || 0)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant="contained" onClick={onOpenCreateModal}>
            Add Mission
          </Button>
          {selectedMission ? (
            <>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              Selected: {selectedMission.title || selectedMission.missionId}
            </Typography>
            <Button size="small" variant="outlined" onClick={onClearSelection}>
              Clear Selection
            </Button>
            </>
          ) : null}
        </Box>
      </Box>
    </Paper>
  );
};

export default StarCamMissionHeader;

