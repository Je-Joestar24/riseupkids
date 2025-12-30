import React from 'react';
import { Box, Container } from '@mui/material';
import AuthLogo from '../../components/auth/AuthLogo';
import AuthLoginForm from '../../components/auth/AuthLoginForm';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

/**
 * AuthLogin Page
 * 
 * Main login page for Rise Up Kids
 * Universal login for all user types
 */
const AuthLogin = () => {
  return (
    <Box className="auth-login-page">
      <Container maxWidth="sm" className="auth-login-container">
        {/* Logo */}
        <AuthLogo />

        {/* Login Card */}
        <Card className="auth-login-card">
          <CardContent className="auth-login-card-content" sx={{margin: '0px', padding: '0px !important'}}>
            <AuthLoginForm />
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default AuthLogin;

