import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Stack } from '@mui/material';

/**
 * Step 2: Account Details
 *
 * Collects name and password, using the email from previous step (read-only).
 * On submit, parentSignup page will call backend to create the Stripe session.
 */
const AuthSignupForm = ({
  email,
  initialName = '',
  onBack,
  onNext,
  loading,
  error,
}) => {
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setLocalError('');

    if (!name.trim() || !password || !confirmPassword) {
      setLocalError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    onNext({ name: name.trim(), password });
  };

  const displayError = localError || error;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{  display: 'flex', flexDirection: 'column', gap: 2 }}
      role="form"
      aria-label="Parent signup details step"
    >
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
        Create your login details
      </Typography>
      <Typography variant="body2" color="text.secondary">
        You’ll use this email and password to access your parent dashboard.
      </Typography>

      <TextField
        label="Email"
        type="email"
        fullWidth
        value={email}
        disabled
        aria-label="Parent email (read only)"
      />

      <TextField
        label="Full name"
        type="text"
        fullWidth
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Parent full name"
      />

      <TextField
        label="Password"
        type="password"
        fullWidth
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        aria-label="Create password"
      />

      <TextField
        label="Confirm password"
        type="password"
        fullWidth
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
        aria-label="Confirm password"
      />

      {displayError && (
        <Typography variant="body2" color="error" role="alert">
          {displayError}
        </Typography>
      )}

      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        <Button
          type="button"
          variant="text"
          color="inherit"
          onClick={onBack}
          aria-label="Back to email step"
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          aria-label="Continue to billing step"
          sx={{
            ml: 'auto',
            textTransform: 'none',
            fontWeight: 600,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: 3,
            },
          }}
        >
          {loading ? 'Creating account...' : 'Continue to billing'}
        </Button>
      </Stack>
    </Box>
  );
};

export default AuthSignupForm;
