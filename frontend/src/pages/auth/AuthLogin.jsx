import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import AuthLogo from '../../components/auth/AuthLogo';
import AuthLoginForm from '../../components/auth/AuthLoginForm';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import useAuth from '../../hooks/userHook';

/**
 * AuthLogin Page
 * 
 * Main login page for Rise Up Kids
 * Universal login for all user types
 */
const AuthLogin = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // TODO: Navigate based on user role when dashboards are ready
      // For now, just prevent access to login page if already logged in
      console.log('User already authenticated, redirecting...');
      // Example navigation (uncomment when dashboard is ready):
      // if (user.role === 'admin') {
      //   navigate('/admin/dashboard');
      // } else if (user.role === 'parent') {
      //   navigate('/parent/dashboard');
      // } else if (user.role === 'child') {
      //   navigate('/child/dashboard');
      // }
    }
  }, [isAuthenticated, user, navigate]);

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

