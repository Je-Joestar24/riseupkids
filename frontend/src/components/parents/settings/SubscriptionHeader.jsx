import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * SubscriptionHeader Component
 * 
 * Header showing current subscription plan and status
 */
const SubscriptionHeader = () => {
  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #f2af10 0%, #e98a68 100%)',
        borderRadius: { xs: '20px', sm: '24px' },
        padding: { xs: '20px', sm: '24px' },
        color: 'white',
        marginBottom: { xs: '20px', sm: '24px' },
        boxShadow: '0 8px 24px rgba(233, 138, 104, 0.3)',
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.5rem', sm: '1.75rem' },
          fontWeight: 700,
          marginBottom: { xs: '8px', sm: '10px' },
        }}
      >
        Premium Plan
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '16px', sm: '18px' },
          fontWeight: 500,
          opacity: 0.9,
        }}
      >
        Active until March 15, 2026
      </Typography>
    </Box>
  );
};

export default SubscriptionHeader;
