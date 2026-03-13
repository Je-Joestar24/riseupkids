import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Divider,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockResetIcon from '@mui/icons-material/LockReset';
import AuthLogo from '../../components/auth/AuthLogo';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import forgetPasswordService from '../../services/forgetPasswordService';

/**
 * Reset password page. Reads email and code from URL: /reset-password?email=...&code=...
 * Form: new password + confirm. On success navigates to login.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const code = searchParams.get('code') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!email || !code || code.length !== 6) {
      navigate('/forget/password', { replace: true });
    }
  }, [email, code, navigate]);

  const validateForm = () => {
    const errors = {};
    if (!newPassword) {
      errors.newPassword = 'Password is required';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    } else if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setSuccessMessage('');
    setErrorMessage('');
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data = await forgetPasswordService.resetPassword(email, code, newPassword);
      if (data?.success) {
        setSuccessMessage(data.message || 'Password has been reset. Redirecting to login...');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      } else {
        setErrorMessage(data?.message || 'Something went wrong.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Invalid or expired reset code. Please request a new code.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!email || !code) return null;

  return (
    <Box className="auth-login-page" role="main" aria-label="Reset password">
      <Container maxWidth="sm" className="auth-login-container">
        <AuthLogo />
        <Card className="auth-login-card">
          <CardContent className="auth-login-card-content" sx={{ margin: '0px', padding: '0px !important' }}>
            <Box component="form" onSubmit={handleSubmit} className="auth-login-form" sx={{ px: 2, py: 3, maxWidth: '350px' }}>
              <Box className="auth-form-header" sx={{ margin: 'auto' }}>
                <Typography variant="h5" className="auth-form-title">
                  New password
                </Typography>
                <LockResetIcon className="auth-lock-icon" aria-hidden="true" />
              </Box>
              <Typography variant="body2" className="auth-form-subtitle" sx={{ fontWeight: '600', fontSize: '18px', margin: 'auto', marginBottom: '20px' }}>
                Enter your new password below
              </Typography>

              {successMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {successMessage}
                </Alert>
              )}
              {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage('')}>
                  {errorMessage}
                </Alert>
              )}

              <Box className="auth-field-container">
                <Typography variant="body2" className="auth-field-label" sx={{ fontWeight: '700', fontSize: '18px' }}>
                  New password
                </Typography>
                <TextField
                  sx={{ fontWeight: '600', fontSize: '18px' }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (formErrors.newPassword) setFormErrors({ ...formErrors, newPassword: '' });
                  }}
                  fullWidth
                  className="auth-text-field"
                  required
                  error={!!formErrors.newPassword}
                  helperText={formErrors.newPassword}
                  disabled={loading}
                  autoComplete="new-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" aria-label="toggle password visibility">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box className="auth-field-container">
                <Typography variant="body2" className="auth-field-label" sx={{ fontWeight: '700', fontSize: '18px' }}>
                  Confirm password
                </Typography>
                <TextField
                  sx={{ fontWeight: '600', fontSize: '18px' }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (formErrors.confirmPassword) setFormErrors({ ...formErrors, confirmPassword: '' });
                  }}
                  fullWidth
                  className="auth-text-field"
                  required
                  error={!!formErrors.confirmPassword}
                  helperText={formErrors.confirmPassword}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                className="auth-signin-button"
                sx={{ borderRadius: '0px', fontSize: '20px' }}
                disabled={loading}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} sx={{ color: 'white' }} />
                    <span>Resetting...</span>
                  </Box>
                ) : (
                  'Reset password'
                )}
              </Button>

              <Box className="auth-links-container" sx={{ margin: 'auto', marginTop: 2 }}>
                <Link
                  component="button"
                  type="button"
                  className="auth-link"
                  sx={{ borderRadius: '0px', fontSize: '18px', fontWeight: '600', marginY: '10px', textDecoration: 'none', cursor: 'pointer' }}
                  onClick={() => navigate('/forget/password')}
                >
                  Request a new code
                </Link>
              </Box>

              <Divider />

              <Box className="auth-create-account-container" sx={{ marginTop: '5px' }}>
                <Link
                  component="button"
                  type="button"
                  className="auth-create-account-link"
                  sx={{ borderRadius: '0px', fontSize: '16px', fontWeight: '600', textDecoration: 'none', cursor: 'pointer' }}
                  onClick={() => navigate('/login')}
                >
                  Back to login
                </Link>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ResetPassword;
