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

    </Stack>
  );
};

export default YoutubeBody;
