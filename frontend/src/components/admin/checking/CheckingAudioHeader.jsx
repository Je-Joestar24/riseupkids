import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AudiotrackOutlined } from '@mui/icons-material';

/**
 * CheckingAudioHeader Component
 * 
 * Header section for Audio Assignment submissions checking page
 */
const CheckingAudioHeader = () => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        padding: 3.5,
        marginBottom: 4,
        marginTop: 2,
        borderRadius: '16px',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[2],
      }}
    >
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${theme.palette.orange.main}, ${theme.palette.orange.dark})`,
                color: '#fff',
              }}
            >
              <AudiotrackOutlined fontSize="large" />
            </Box>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  fontSize: '1.75rem',
                  color: theme.palette.text.primary,
                }}
              >
                Review Audio Submissions
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: theme.palette.text.secondary,
                  fontSize: '0.9375rem',
                  marginTop: 1,
                }}
              >
                Review and approve audio assignment submissions from children
              </Typography>
            </Box>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
};

export default CheckingAudioHeader;
