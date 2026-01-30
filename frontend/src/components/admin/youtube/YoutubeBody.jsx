import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { VideocamOutlined as VideocamIcon, InfoOutlined as InfoIcon } from '@mui/icons-material';
import useYouTubeLive from '../../../hooks/youtubeHook';

/**
 * YoutubeBody Component
 *
 * Body section for YouTube Live management page
 * Shows instructions and empty state
 */
const YoutubeBody = () => {
  const theme = useTheme();
  const { connectionStatus } = useYouTubeLive();

  return (
    <Stack spacing={3}>
      {/* Instructions Card */}
      <Paper
        sx={{
          padding: 3.5,
          borderRadius: '16px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
          boxShadow: theme.shadows[2],
        }}
      >
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon sx={{ color: theme.palette.orange?.main || theme.palette.primary.main }} />
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              How to Start a Live Class
            </Typography>
          </Box>
          <Stack spacing={1.5}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
              }}
            >
              <strong>Step 1:</strong> An admin must connect the YouTube account once (using the "Connect YouTube" button above). 
              <strong> Note:</strong> The system uses a pre-configured LMS channel. Teachers don't need to connect anything - 
              they can create streams directly once the admin has connected the account.
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
              }}
            >
              <strong>Step 2:</strong> Click "Start Live Class" to create a new live stream. You'll receive a stream key and RTMP URL.
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
              }}
            >
              <strong>Step 3:</strong> Open OBS Studio and configure it with the provided stream key and RTMP URL.
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
              }}
            >
              <strong>Step 4:</strong> In OBS, go to Settings → Stream, select "Custom" as the service, paste the RTMP URL in the "Server" field and the stream key in the "Stream Key" field, then click "Start Streaming".
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
              }}
            >
              <strong>Step 5:</strong> Your live stream will appear on the LMS YouTube channel, and students can watch it via the provided watch URL.
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      {/* Connection Status Alert */}
      {!connectionStatus.connected && !connectionStatus.loading && (
        <Alert
          severity="info"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            borderRadius: '12px',
          }}
        >
          <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
            Please connect your YouTube account to start creating live streams.
          </Typography>
        </Alert>
      )}

      {/* Empty State */}
      <Paper
        sx={{
          padding: 3.5,
          borderRadius: '16px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
          boxShadow: theme.shadows[2],
        }}
      >
        <Box sx={{ textAlign: 'center', padding: 4 }}>
          <VideocamIcon
            sx={{
              fontSize: 64,
              color: theme.palette.text.secondary,
              marginBottom: 2,
            }}
          />
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              color: theme.palette.text.primary,
              marginBottom: 1,
            }}
          >
            No live streams yet
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
            }}
          >
            Create your first live stream to get started
          </Typography>
        </Box>
      </Paper>
    </Stack>
  );
};

export default YoutubeBody;
