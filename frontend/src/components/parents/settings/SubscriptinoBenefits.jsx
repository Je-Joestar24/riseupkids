import React from 'react';
import { Box, Typography } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';
import { FAMILY_PLAN_BENEFITS } from '../../../services/checkoutService';

/**
 * Benefits included in the Family Plan (aligned with sale checkout summary).
 */
const SubscriptionBenefits = () => {
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
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.25rem', sm: '1.375rem' },
          fontWeight: 600,
          color: themeColors.secondary,
          marginBottom: { xs: '20px', sm: '24px' },
        }}
      >
        What&apos;s included
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '14px', sm: '16px' } }}>
        {FAMILY_PLAN_BENEFITS.map((benefit) => (
          <Box
            key={benefit}
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
              aria-hidden
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
