import React from 'react';
import { Box, Container, Card, CardContent, Typography } from '@mui/material';
import AuthLogo from '../../components/auth/AuthLogo';
import TwoFactorSetupFlow from '../../components/auth/TwoFactorSetupFlow';
import useAuth from '../../hooks/userHook';

/**
 * Mandatory TOTP enrollment for admin accounts (Chunk 10). Reached whenever an admin session
 * carries `twoFactorEnrollmentRequired: true` — no cancel option, since this is the one screen
 * standing between a logged-in admin and everything else in the admin panel.
 */
const AdminSetupTwoFactor = () => {
  const { fetchCurrentUser } = useAuth();

  const handleComplete = async () => {
    // Re-fetch /me so twoFactorEnrollmentRequired flips to false in state before navigating —
    // otherwise a stale flag would bounce the admin right back to this screen.
    try {
      await fetchCurrentUser();
    } catch {
      // fall through to redirect regardless — the backend enrollment state is authoritative
    }
    window.location.assign('/admin/dashboard');
  };

  return (
    <Box
      role="main"
      aria-label="Set up two-factor authentication"
      sx={{ minHeight: '100vh', py: 6, bgcolor: '#F5F5DC' }}
    >
      <Container maxWidth="sm">
        <AuthLogo />
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>
              Set up two-factor authentication
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Admin accounts require two-factor authentication. This only takes a minute.
            </Typography>
            <TwoFactorSetupFlow onComplete={handleComplete} />
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default AdminSetupTwoFactor;
