import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import NotificationsNone from '@mui/icons-material/NotificationsNone';

const NotificationsHeader = ({ onCreate }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 2,
        flexWrap: 'wrap',
        marginBottom: 3,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <NotificationsNone sx={{ color: theme.palette.orange.main, fontSize: 28 }} />
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
            Notifications
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
              fontSize: '0.9375rem',
              marginTop: 0.5,
            }}
          >
            Create, schedule, send, and test notification campaigns
          </Typography>
        </Box>
      </Stack>
      <Button
        variant="contained"
        onClick={onCreate}
        aria-label="Create notification"
        sx={{ fontFamily: 'Quicksand, sans-serif', textTransform: 'none', fontWeight: 700 }}
      >
        Create notification
      </Button>
    </Box>
  );
};

export default NotificationsHeader;
