import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * Family Plan details: children enrolled, pricing, access period.
 */
const SubscriptionDetails = ({ plan }) => {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const regionLabel = (() => {
    const map = { br: 'Brazil', us: 'United States', eu: 'Europe' };
    return map[plan.userRegion] || null;
  })();

  const details = [
    ...(plan.isFamilyPlan
      ? [{
          label: 'Children enrolled',
          value: plan.childrenLabel,
          highlight: false,
        }]
      : []),
    {
      label: plan.isFamilyPlan ? 'Plan price' : 'Monthly cost',
      value: plan.planPricing.line1,
      subValue: plan.priceLine2,
      highlight: true,
    },
    ...(plan.isFamilyPlan && plan.planPricing.discountFormatted
      ? [{ label: 'Founding families savings', value: plan.planPricing.discountFormatted, highlight: false }]
      : []),
    {
      label: 'Billing',
      value: plan.isFamilyPlan ? 'Annual program (12 months)' : 'Monthly subscription',
      highlight: false,
    },
    ...(regionLabel
      ? [{ label: 'Region', value: regionLabel, highlight: false }]
      : []),
    {
      label: plan.isFamilyPlan ? 'Access until' : 'Next billing date',
      value: formatDate(plan.accessEndDate),
      highlight: false,
    },
    {
      label: 'Cancellation',
      value: plan.cancellationStatus,
      highlight: false,
    },
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

      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {details.map((detail, index) => (
          <Box
            key={detail.label}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 2,
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
            <Box sx={{ textAlign: 'right', maxWidth: '60%' }}>
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '16px', sm: '18px' },
                  fontWeight: detail.highlight ? 700 : 500,
                  color: detail.highlight ? themeColors.secondary : themeColors.textSecondary,
                }}
              >
                {detail.value}
              </Typography>
              {detail.subValue && (
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: { xs: '13px', sm: '14px' },
                    fontWeight: 500,
                    color: themeColors.textSecondary,
                    mt: 0.25,
                  }}
                >
                  {detail.subValue}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default SubscriptionDetails;
