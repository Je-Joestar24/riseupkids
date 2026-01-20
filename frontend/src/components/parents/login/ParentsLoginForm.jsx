import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import useAuth from '../../../hooks/userHook';
import authService from '../../../services/authService';

/**
 * ParentsLoginForm Component
 * 
 * Password verification form for parent dashboard access
 * Uses the logged-in parent's email (from Redux state) and verifies password
 * Similar to password verification in ParentChildAddModal
 */
const ParentLoginForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get email from logged-in user
  const email = user?.email || '';
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [verifying, setVerifying] = useState(false);

  const validateForm = () => {
    const errors = {};
    
    // Email is static, no need to validate
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setFormErrors({});
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    if (!email) {
      setFormErrors({ password: 'Unable to verify. Please ensure you are logged in.' });
      return;
    }
    
    setVerifying(true);
    
    try {
      // Verify password by attempting to login (this verifies password without changing session)
      await authService.login(email, password);
      
      // Password verified successfully - set flag and navigate to dashboard
      sessionStorage.setItem('dashboardPasswordVerified', 'true');
      setPassword(''); // Clear password for security
      navigate('/parent/dashboard');
    } catch (error) {
      // Password verification failed
      setFormErrors({ password: 'Incorrect password. Please try again.' });
      setPassword(''); // Clear password on error
    } finally {
      setVerifying(false);
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} className="auth-login-form">
      {/* Title with lock icon */}
      <Box className="auth-form-header"  sx={{margin: 'auto'}}>
        <Typography variant="h5" className="auth-form-title">
          Parent/Teacher Access
        </Typography>
        <LockIcon className="auth-lock-icon" />
      </Box>

      {/* Subtitle */}
      <Typography variant="body2" className="auth-form-subtitle" sx={{ fontWeight: '600', fontSize: '18px', margin: 'auto', marginBottom: '20px' }}>
        Manage settings and progress
      </Typography>

      {/* Email Field */}
      <Box className="auth-field-container">
        <Typography variant="body2" className="auth-field-label" sx={{ fontWeight: '700', fontSize: '18px' }}>
          Email
        </Typography>
        <TextField
          sx={{ fontWeight: '600', fontSize: '18px'}}
          type="email"
          value={email}
          fullWidth
          className="auth-text-field"
          required
          disabled={true} // Email is from logged-in user and not editable
          InputProps={{
            readOnly: true,
          }}
        />
      </Box>

      {/* Password Field */}
      <Box className="auth-field-container">
        <Typography variant="body2" className="auth-field-label" sx={{ fontWeight: '700', fontSize: '18px' }}>
          Password
        </Typography>
        <TextField
          sx={{ fontWeight: '600', fontSize: '18px' }}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (formErrors.password) {
              setFormErrors({ ...formErrors, password: '' });
            }
          }}
          fullWidth
          className="auth-text-field"
          placeholder="Password"
          required
          error={!!formErrors.password}
          helperText={formErrors.password}
          disabled={verifying}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleTogglePassword}
                  edge="end"
                  aria-label="toggle password visibility"
                  className="auth-password-toggle"
                  disabled={verifying}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Sign In Button */}
      <Button
        type="submit"
        variant="contained"
        fullWidth
        className="auth-signin-button"
        sx={{borderRadius: '0px', fontSize: '20px'}}
        disabled={verifying || !password.trim()}
      >
        {verifying ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} sx={{ color: 'white' }} />
            <span>Verifying...</span>
          </Box>
        ) : (
          'Verify'
        )}
      </Button>

      {/* Back to Kid Login Link */}
      <Box className="auth-links-container"
        sx={{margin: 'auto', marginTop: '20px'}}>
        <Link
          onClick={() => navigate('/parents/child')}
          className="auth-link"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderRadius: '0px',
            fontSize: '16px',
            fontWeight: '600',
            marginY: '10px',
            textDecoration: 'none',
            cursor: 'pointer',
            color: '#475569',
            '&:hover': {
              color: '#0f172a',
            },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: '1rem' }} />
          Back to Kid Login
        </Link>
      </Box>
    </Box>
  );
};

export default ParentLoginForm;

