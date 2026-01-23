import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Box, Container, Card, CardContent, Typography, CircularProgress, Button } from '@mui/material';
import AuthLogo from '../../components/auth/AuthLogo';
import stripeService from '../../services/stripeService';
import { setUser } from '../../store/slices/userSlice';

const ParentSignupSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sessionId = searchParams.get('session_id') || '';

  useEffect(() => {
    let isMounted = true;

    const completeSignup = async () => {
      if (!sessionId) {
        setError('Missing session information. Please start signup again.');
        setLoading(false);
        return;
      }

      try {
        const data = await stripeService.verifyCheckoutSession(sessionId);

        if (data?.token && data?.user) {
          // Persist auth like normal login
          sessionStorage.setItem('token', data.token);
          sessionStorage.setItem('user', JSON.stringify(data.user));

          // Update Redux auth state (isAuthenticated, user)
          dispatch(setUser(data.user));

          // Redirect to parent dashboard
          navigate('/parent/dashboard', { replace: true });
          return;
        }

        if (isMounted) {
          setError(
            'We could not confirm your subscription yet. If you completed payment, please try again in a moment or contact support.'
          );
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err?.message ||
            err?.response?.data?.message ||
            'There was a problem verifying your payment. Please try again.';
          setError(message);
          setLoading(false);
        }
      }
    };

    completeSignup();

    return () => {
      isMounted = false;
    };
  }, [sessionId, dispatch, navigate]);

  return (
    <Box className="auth-signup-page" role="main" aria-label="Parent signup success page">
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
            aria-label="Completing parent signup"
          >
            {loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Finalizing your subscription...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please wait while we confirm your payment and prepare your parent dashboard.
                </Typography>
              </Box>
            )}

            {!loading && error && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" color="error" role="alert" sx={{ fontWeight: 600 }}>
                  {error}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/parent/signup')}
                  aria-label="Return to parent signup"
                >
                  Go back to signup
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ParentSignupSuccess;

