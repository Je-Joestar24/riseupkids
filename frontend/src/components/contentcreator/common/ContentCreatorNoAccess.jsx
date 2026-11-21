import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useAuth } from '../../../hooks/userHook';

/**
 * Shown to a content creator who has no area at all (an admin has not given her anything yet, or took everything
 * away). It says so plainly and lets her sign out; there is nowhere else for her to go, so it never redirects.
 */
const ContentCreatorNoAccess = () => {
  const { logout } = useAuth();

  return (
    <Box
      role="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Typography variant="h5" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
        You don&apos;t have access to anything yet
      </Typography>
      <Typography variant="body1" sx={{ maxWidth: 460 }}>
        An admin has not given your account access to any area. Please ask an admin to choose what you can use.
      </Typography>
      <Button variant="outlined" onClick={logout} sx={{ textTransform: 'none' }}>
        Sign out
      </Button>
    </Box>
  );
};

export default ContentCreatorNoAccess;
