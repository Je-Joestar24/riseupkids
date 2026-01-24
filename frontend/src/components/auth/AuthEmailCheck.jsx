import React, { useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';

/**
 * Step 1: Email Check
 *
 * UX step to collect parent email before full signup.
 * Backend still enforces uniqueness when creating the Stripe session.
 */
const AuthEmailCheck = ({ initialEmail = '', onNext, loading, error }) => {
  const [email, setEmail] = useState(initialEmail);
  const [localError, setLocalError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setLocalError('');

    if (!email.trim()) {
      setLocalError('Please enter your email.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    onNext(email.trim().toLowerCase());
  };

  const displayError = localError || error;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      role="form"
      aria-label="Parent signup email step"
    >
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
        Start your parent account
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Enter your email to begin. We’ll check if you already have an account.
      </Typography>

      <TextField
        id="parent-email"
        label="Email"
        type="email"
        required
        fullWidth
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        aria-label="Parent email address"
      />

      {displayError && (
        <Typography variant="body2" color="error" role="alert">
          {displayError}
        </Typography>
      )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={loading}
        aria-label="Continue to create account"
        sx={{
          mt: 1,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: 3,
          },
        }}
      >
        {loading ? 'Checking...' : 'Continue'}
      </Button>
    </Box>
  );
};

export default AuthEmailCheck;
