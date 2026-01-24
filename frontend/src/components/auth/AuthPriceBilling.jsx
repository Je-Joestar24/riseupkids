import React from 'react';
import { Box, Typography, Button, Stack, Divider } from '@mui/material';

/**
 * Step 3: Billing Summary
 *
 * Shows the subscription price and yearly commitment before redirecting to Stripe.
 */
const AuthPriceBilling = ({ email, name, onBack, onContinue, loading, error }) => {
  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      role="region"
      aria-label="Parent subscription billing summary"
    >
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
        Review your plan
      </Typography>

      <Typography variant="body2" color="text.secondary">
        {name ? `Parent: ${name}` : null}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Signed up with: <strong>{email}</strong>
      </Typography>

      <Box
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 2,
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 1,
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: 3,
            transform: 'translateY(-1px)',
          },
        }}
        role="group"
        aria-label="Subscription details"
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Rise Up Kids Parent Subscription
        </Typography>
        <Typography variant="h6" sx={{ mt: 1 }}>
          $9.99 <Typography component="span" variant="body2">USD / month</Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Billed monthly on Stripe with a <strong>1-year minimum commitment</strong>.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You can manage your subscription and payment method through Stripe after signup.
        </Typography>
      </Box>

      <Divider sx={{ my: 1 }} />

      {error && (
        <Typography variant="body2" color="error" role="alert">
          {error}
        </Typography>
      )}

      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        <Button
          type="button"
          variant="text"
          color="inherit"
          onClick={onBack}
          aria-label="Back to account details step"
        >
          Back
        </Button>
        <Button
          type="button"
          variant="contained"
          color="primary"
          disabled={loading}
          onClick={onContinue}
          aria-label="Continue to Stripe secure payment"
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
          {loading ? 'Redirecting…' : 'Continue to secure payment'}
        </Button>
      </Stack>
    </Box>
  );
};

export default AuthPriceBilling;
