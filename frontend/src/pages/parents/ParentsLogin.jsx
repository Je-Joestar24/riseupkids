import React from 'react';
import { Box, Container } from '@mui/material';
import ParentLoginLogo from '../../components/parents/login/ParentLoginLogo';
import ParentsLoginForm from '../../components/parents/login/ParentsLoginForm';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

/**
 * ParentsLogin Page
 * 
 * Secondary authentication page for parents
 * Requires parent to be already logged in (via AuthedAccess)
 * Used for password verification before accessing parent dashboard
 * Similar layout to AuthLogin but with static email field
 */
const ParentsLogin = () => {

  return (
    <Box className="auth-login-page">
      <Container maxWidth="sm" className="auth-login-container">
        {/* Logo */}
        <ParentLoginLogo />

        {/* Login Card */}
        <Card className="auth-login-card">
          <CardContent className="auth-login-card-content" sx={{margin: '0px', padding: '0px !important'}}>
            <ParentsLoginForm />
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ParentsLogin;
