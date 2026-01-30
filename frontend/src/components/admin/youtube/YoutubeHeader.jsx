import React from 'react';
import { Box, Typography, Paper, Stack, Button, Chip, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add as AddIcon, Link as LinkIcon, LinkOff as LinkOffIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import useYouTubeLive from '../../../hooks/youtubeHook';

/**
 * YoutubeHeader Component
 *
 * Header section for YouTube Live management page
 * Shows title, YouTube connection status, and create stream button
 */
const YoutubeHeader = ({ onCreateClick }) => {
  const theme = useTheme();
  const user = useSelector((state) => state.user?.user || state.auth?.user);
  const isAdmin = user?.role === 'admin';
  const {
    connectionStatus,
    getAuthUrl,
    disconnectYouTube,
    streamLoading,
  } = useYouTubeLive();

  const handleConnect = async () => {
    try {
      await getAuthUrl();
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect your YouTube account?')) {
      try {
        await disconnectYouTube();
      } catch (error) {
        console.error('Failed to disconnect:', error);
      }
    }
  };

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
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
              YouTube Live Classes
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
              Create and manage live streaming sessions for your classes
            </Typography>
          </Box>
          {onCreateClick && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onCreateClick}
              disabled={streamLoading || !connectionStatus.connected}
              aria-label="Create live stream"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                fontSize: '0.875rem',
                padding: '10px 24px',
                borderRadius: '8px',
                textTransform: 'none',
                backgroundColor: theme.palette.orange?.main || theme.palette.primary.main,
                color: theme.palette.textCustom?.inverse || theme.palette.primary.contrastText,
                '&:hover': {
                  backgroundColor: theme.palette.orange?.dark || theme.palette.primary.dark,
                },
                '&:disabled': {
                  backgroundColor: theme.palette.action.disabledBackground,
                  color: theme.palette.action.disabled,
                },
              }}
            >
              Start Live Class
            </Button>
          )}
        </Box>

        {/* Connection Status */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: 2,
            borderRadius: '8px',
            backgroundColor: theme.palette.background.default,
          }}
        >
          {connectionStatus.loading ? (
            <Typography
              variant="body2"
              sx={{ color: theme.palette.text.secondary, fontFamily: 'Quicksand, sans-serif' }}
            >
              Checking connection status...
            </Typography>
          ) : (
            <>
              <Chip
                icon={connectionStatus.connected ? <LinkIcon /> : <LinkOffIcon />}
                label={
                  connectionStatus.connected
                    ? `Connected: ${connectionStatus.connectedEmail || 'YouTube Account'}`
                    : 'Not Connected'
                }
                color={connectionStatus.connected ? 'success' : 'warning'}
                variant="outlined"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                }}
              />
              {isAdmin && (
                <Button
                  variant={connectionStatus.connected ? 'outlined' : 'contained'}
                  size="small"
                  onClick={connectionStatus.connected ? handleDisconnect : handleConnect}
                  disabled={streamLoading}
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    borderRadius: '6px',
                  }}
                >
                  {connectionStatus.connected ? 'Disconnect' : 'Connect YouTube'}
                </Button>
              )}
              {!isAdmin && !connectionStatus.connected && (
                <Alert severity="info" sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '0.75rem' }}>
                  Please ask an admin to connect the YouTube account
                </Alert>
              )}
            </>
          )}
        </Box>
      </Stack>
    </Paper>
  );
};

export default YoutubeHeader;
