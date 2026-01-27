import React from 'react';
import { Box, Typography, Paper, Stack, Button, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add as AddIcon, Link as LinkIcon, LinkOff as LinkOffIcon } from '@mui/icons-material';
import useMeetings from '../../../hooks/meetingHooks';

/**
 * MeetingsHeader Component
 *
 * Header section for Meetings management page
 * Shows title, Google connection status, and create meeting button
 */
const MeetingsHeader = ({ onCreateClick }) => {
  const theme = useTheme();
  const { connectionStatus, initiateOAuth, disconnectGoogle, loading } = useMeetings();

  const handleConnect = async () => {
    try {
      await initiateOAuth();
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect your Google account?')) {
      try {
        await disconnectGoogle();
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
              Meetings
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
              Manage and track your scheduled meetings
            </Typography>
          </Box>
          {onCreateClick && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onCreateClick}
              disabled={loading || (!connectionStatus.connected && connectionStatus.oAuthEnabled)}
              aria-label="Create meeting"
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
              Create Meeting
            </Button>
          )}
        </Box>

        {/* Connection Status */}
        {connectionStatus.oAuthEnabled && (
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
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Quicksand, sans-serif' }}>
                Checking connection status...
              </Typography>
            ) : (
              <>
                <Chip
                  icon={connectionStatus.connected ? <LinkIcon /> : <LinkOffIcon />}
                  label={
                    connectionStatus.connected
                      ? `Connected: ${connectionStatus.connectedEmail || 'Google Account'}`
                      : 'Not Connected'
                  }
                  color={connectionStatus.connected ? 'success' : 'warning'}
                  variant="outlined"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                  }}
                />
                <Button
                  variant={connectionStatus.connected ? 'outlined' : 'contained'}
                  size="small"
                  onClick={connectionStatus.connected ? handleDisconnect : handleConnect}
                  disabled={loading}
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    borderRadius: '6px',
                  }}
                >
                  {connectionStatus.connected ? 'Disconnect' : 'Connect Google'}
                </Button>
              </>
            )}
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

export default MeetingsHeader;
