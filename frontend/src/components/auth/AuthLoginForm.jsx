import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

/**
 * AuthLoginForm Component
 * 
 * Login form with email and password fields
 * Placeholder functionality - no actual authentication yet
 */
const AuthLoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder - will implement authentication later
    console.log('Login attempt:', { email, password });
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
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          className="auth-text-field"
          required
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
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          className="auth-text-field"
          placeholder="Password"
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleTogglePassword}
                  edge="end"
                  aria-label="toggle password visibility"
                  className="auth-password-toggle"
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
      >
        Sign In
      </Button>

      {/* Forgot Password Link */}
      <Box className="auth-links-container"
        sx={{margin: 'auto'}}>
        <Link href="#" className="auth-link" 
        sx={{borderRadius: '0px', fontSize: '18px', fontWeight: '600', marginY: '10px', textDecoration: 'none'}}>
          Forgot Password?
        </Link>
      </Box>

      <Divider/>

      {/* Create Account Link */}
      <Box className="auth-create-account-container" 
        sx={{marginTop: '5px'}}>
        <Link href="#" className="auth-create-account-link"
        sx={{borderRadius: '0px', fontSize: '16px', fontWeight: '600', textDecoration: 'none'}}>
          New here? Create Account
        </Link>
      </Box>
    </Box>
  );
};

export default AuthLoginForm;

