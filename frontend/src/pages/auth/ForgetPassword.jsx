import React from 'react';
import { Box, Container, Card, CardContent } from '@mui/material';
import AuthLogo from '../../components/auth/AuthLogo';
import ForgetPasswordForm from '../../components/auth/ForgetPasswordForm';

/**
 * Forgot password page: user enters email to receive a 6-digit reset code.
 * Layout matches AuthLogin (logo + card with form).
 */
const ForgetPassword = () => {
  return (
    <Box className="auth-login-page" role="main" aria-label="Forgot password">
      <Container maxWidth="sm" className="auth-login-container">
        <AuthLogo />
        <Card className="auth-login-card">
          <CardContent className="auth-login-card-content" sx={{ margin: '0px', padding: '0px !important' }}>
            <ForgetPasswordForm />
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ForgetPassword;
