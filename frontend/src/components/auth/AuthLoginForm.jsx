import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import useAuth from '../../hooks/userHook';

/**
 * AuthLoginForm Component
 * 
 * Login form with email and password fields
 * Connected to authentication service via useAuth hook
 */
const AuthLoginForm = () => {
  const { login, loading, isAuthenticated, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const getRoleRedirectPath = (role) => {
    if (role === 'parent') return '/parents/child';
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'teacher') return '/teacher/dashboard';
    return '/';
  };

  // If already authenticated, hard-reload into the correct dashboard.
  useEffect(() => {
    if (isAuthenticated && user) {
      window.location.assign(getRoleRedirectPath(user.role));
    }
  }, [isAuthenticated, user]);

  const validateForm = () => {
    const errors = {};
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email is invalid';
    }
    
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
    
    try {
      const result = await login(email, password);
      // Intentionally do a full reload after login so all user-dependent UI hydrates reliably.
      const role = result?.user?.role || result?.data?.user?.role || user?.role;
      window.location.assign(getRoleRedirectPath(role));
    } catch (error) {
      // Error notification is already shown by the hook
      console.error('Login error:', error);
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
          Login now
        </Typography>
        <LockIcon className="auth-lock-icon" />
      </Box>

      {/* Subtitle */}
      <Typography variant="body2" className="auth-form-subtitle" sx={{ fontWeight: '600', fontSize: '18px', margin: 'auto', marginBottom: '20px' }}>
        Sign in to access your learning journey
      </Typography>

      {/* Email Field */}
      <Box className="auth-field-container">
        <Typography variant="body2" className="auth-field-label" sx={{ fontWeight: '700', fontSize: '18px' }}>
          Email
        </Typography>
        <TextField
          sx={{ fontWeight: '600', fontSize: '18px'}}
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (formErrors.email) {
              setFormErrors({ ...formErrors, email: '' });
            }
          }}
          fullWidth
          className="auth-text-field"
          required
          error={!!formErrors.email}
          helperText={formErrors.email}
          disabled={loading}
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
          disabled={loading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleTogglePassword}
                  edge="end"
                  aria-label="toggle password visibility"
                  className="auth-password-toggle"
                  disabled={loading}
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
        disabled={loading}
      >
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} sx={{ color: 'white' }} />
            <span>Signing In...</span>
          </Box>
        ) : (
          'Sign In'
        )}
      </Button>

      {/* Forgot Password Link */}
      <Box className="auth-links-container" sx={{ margin: 'auto' }}>
        <Link
          component="button"
          type="button"
          className="auth-link"
          sx={{ borderRadius: '0px', fontSize: '18px', fontWeight: '600', marginY: '10px', textDecoration: 'none', cursor: 'pointer' }}
          onClick={() => window.location.assign('/forget/password')}
        >
          Forgot Password?
        </Link>
      </Box>

      <Divider/>

      {/* Create Account Link */}
      <Box className="auth-create-account-container" 
        sx={{marginTop: '5px'}}>
        <Link onClick={() => window.location.assign('/parent/signup')} className="auth-create-account-link"
        sx={{borderRadius: '0px', fontSize: '16px', fontWeight: '600', textDecoration: 'none'}}>
          New here? Create Account
        </Link>
      </Box>
    </Box>
  );
};

export default AuthLoginForm;

