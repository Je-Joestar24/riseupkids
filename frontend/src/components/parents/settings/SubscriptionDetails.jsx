import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * SubscriptionDetails Component
 * 
 * Shows plan details like cost, billing date, and payment method
 */
const SubscriptionDetails = () => {
  const details = [
    { label: 'Monthly Cost', value: '$9.99/mo', highlight: true },
    { label: 'Next Billing Date', value: 'Jan 15, 2026', highlight: false },
    { label: 'Payment Method', value: '•••• 4242', highlight: false },
  ];

  return (
    <Box
      sx={{
        backgroundColor: themeColors.bgCard,
        borderRadius: { xs: '20px', sm: '24px' },
        padding: { xs: '20px', sm: '24px' },
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        marginBottom: { xs: '20px', sm: '24px' },
      }}
    >
      {/* Title */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.25rem', sm: '1.375rem' },
          fontWeight: 600,
          color: themeColors.secondary,
          marginBottom: { xs: '20px', sm: '24px' },
        }}
      >
        Plan Details
      </Typography>

      {/* Details List */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {details.map((detail, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: { xs: '12px 0', sm: '14px 0' },
              borderBottom: index < details.length - 1 ? `1px solid ${themeColors.border}` : 'none',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '16px', sm: '18px' },
                fontWeight: 500,
                color: themeColors.text,
              }}
            >
              {detail.label}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '16px', sm: '18px' },
                fontWeight: detail.highlight ? 600 : 500,
                color: detail.highlight ? themeColors.secondary : themeColors.textSecondary,
              }}
            >
              {detail.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default SubscriptionDetails;
