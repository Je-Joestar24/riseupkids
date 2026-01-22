import React from 'react';
import { Box, Typography } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';

/**
 * SubscriptionBenefits Component
 * 
 * Lists all premium benefits included in the subscription
 */
const SubscriptionBenefits = () => {
  const benefits = [
    'Access to all learning paths',
    'Live lessons with expert teachers',
    'Progress reports & analytics',
    'Unlimited practice activities',
    'Ad-free experience',
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
        Premium Benefits
      </Typography>

      {/* Benefits List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '14px', sm: '16px' } }}>
        {benefits.map((benefit, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: '12px', sm: '14px' },
            }}
          >
            <CheckCircle
              sx={{
                fontSize: '24px',
                color: themeColors.primary,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '16px', sm: '18px' },
                fontWeight: 500,
                color: themeColors.text,
              }}
            >
              {benefit}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default SubscriptionBenefits;
