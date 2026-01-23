import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Container, Card, CardContent, Typography, Button } from '@mui/material';
import AuthLogo from '../../components/auth/AuthLogo';

const ParentSignupCancel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = searchParams.get('email') || '';

  const handleRetry = () => {
    const params = new URLSearchParams();
    if (email) params.set('email', email);
    params.set('step', '2');
    navigate(`/parent/signup?${params.toString()}`);
  };

  return (
    <Box className="auth-signup-page" role="main" aria-label="Parent signup cancelled page">
      <Container maxWidth="sm" className="auth-signup-container">
        <AuthLogo />

        <Card
          className="auth-signup-card"
          sx={{
            mt: 3,
            overflow: 'hidden',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4,
            },
          }}
        >
          <CardContent
            className="auth-signup-card-content"
            sx={{ m: 0, p: 3, textAlign: 'center' }}
            aria-label="Parent signup cancelled"
          >
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Payment cancelled
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your parent account has not been activated because the payment was not completed.
              You can try again anytime to start your subscription.
            </Typography>

            <Button
              variant="contained"
              color="primary"
              onClick={handleRetry}
              aria-label="Retry parent signup"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ParentSignupCancel;

