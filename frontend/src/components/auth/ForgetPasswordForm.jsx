import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import forgetPasswordService from '../../services/forgetPasswordService';
import { RISEUP_CHECKOUT_URL } from '../../config/constants';

/**
 * Forgot password form: email input and Send code button.
 * On success, navigates to SendCode with email in state.
 * Layout and classes match AuthLoginForm.
 */
const ForgetPasswordForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = () => {
    const errors = {};
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email is invalid';
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
      const data = await forgetPasswordService.requestCode(email);
      if (data?.success) {
        setSuccessMessage(data.message || 'A reset code has been sent to your email.');
        setTimeout(() => {
          navigate('/sendcode', { state: { email: email.trim() } });
        }, 1500);
      } else {
        setErrorMessage(data?.message || 'Something went wrong.');
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to send code. Please try again.';
      setErrorMessage(msg);
      if (err?.response?.status === 404) {
        setFormErrors({ email: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} className="auth-login-form" sx={{maxWidth: '350px'}}>
      <Box className="auth-form-header" sx={{ margin: 'auto' }}>
        <Typography variant="h5" className="auth-form-title">
          Forgot password
        </Typography>
        <MailOutlineIcon className="auth-lock-icon" aria-hidden="true" />
      </Box>

      <Typography variant="body2" className="auth-form-subtitle" sx={{ fontWeight: '600', fontSize: '18px', margin: 'auto', marginBottom: '20px' }}>
        Enter your email and we&apos;ll send you a 6-digit code
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
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
          Email
        </Typography>
        <TextField
          sx={{ fontWeight: '600', fontSize: '18px' }}
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
          }}
          fullWidth
          className="auth-text-field"
          required
          error={!!formErrors.email}
          helperText={formErrors.email}
          disabled={loading}
          autoComplete="email"
          aria-label="Email address"
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
            <span>Sending...</span>
          </Box>
        ) : (
          'Send code'
        )}
      </Button>

      <Box className="auth-links-container" sx={{ margin: 'auto' }}>
        <Link
          component="button"
          type="button"
          className="auth-link"
          sx={{ borderRadius: '0px', fontSize: '18px', fontWeight: '600', marginY: '10px', textDecoration: 'none', cursor: 'pointer' }}
          onClick={() => navigate('/login')}
        >
          Back to login
        </Link>
      </Box>

      <Divider />

      <Box className="auth-create-account-container" sx={{ marginTop: '5px' }}>
        <Link
          href={RISEUP_CHECKOUT_URL}
          className="auth-create-account-link"
          sx={{ borderRadius: '0px', fontSize: '16px', fontWeight: '600', textDecoration: 'none' }}
          rel="noopener noreferrer"
          aria-label="Create a new account on Rise Up Kids checkout"
        >
          New here? Create Account
        </Link>
      </Box>
    </Box>
  );
};

export default ForgetPasswordForm;
