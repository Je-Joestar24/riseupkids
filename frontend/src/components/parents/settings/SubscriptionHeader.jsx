import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Header showing Family Plan status and access period.
 */
const SubscriptionHeader = ({ plan }) => {
  const formatDate = (date) => {
    if (!date) return null;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusText = () => {
    if (!plan.isActive) {
      return 'No active enrollment';
    }
    if (plan.accessEndDate) {
      return `Active until ${formatDate(plan.accessEndDate)}`;
    }
    return 'Active — 12 months of program access';
  };

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
          marginBottom: { xs: '4px', sm: '6px' },
        }}
      >
        {plan.programTitle}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '14px', sm: '16px' },
          fontWeight: 500,
          opacity: 0.9,
          marginBottom: { xs: '8px', sm: '10px' },
        }}
      >
        {plan.programSubtitle}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '16px', sm: '18px' },
          fontWeight: 600,
          opacity: 0.95,
        }}
      >
        {getStatusText()}
      </Typography>
    </Box>
  );
};

export default SubscriptionHeader;
