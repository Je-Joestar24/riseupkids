import React from 'react';
import { Box } from '@mui/material';
import SubscriptionHeader from './SubscriptionHeader';
import SubscriptionDetails from './SubscriptionDetails';
import SubscriptionBenefits from './SubscriptinoBenefits';
import SubscriptionActions from './SubscriptionActions';

/**
 * SubscriptionSettings Component
 * 
 * Main subscription management page
 * Shows current plan, details, benefits, and management options
 * Ready for Stripe integration
 */
const SubscriptionSettings = () => {
  const handleUpdatePayment = () => {
    console.log('Opening payment update...');
    // TODO: Integrate with Stripe
  };

  const handleCancelPlan = () => {
    console.log('Opening cancel plan confirmation...');
    // TODO: Integrate with Stripe and show confirmation dialog
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: '20px', sm: '24px' },
        width: '100%',
      }}
    >
      {/* Header with Plan Status */}
      <SubscriptionHeader />

      {/* Plan Details */}
      <SubscriptionDetails />

      {/* Premium Benefits */}
      <SubscriptionBenefits />

      {/* Action Buttons */}
      <SubscriptionActions
        onUpdatePayment={handleUpdatePayment}
        onCancelPlan={handleCancelPlan}
      />
    </Box>
  );
};

export default SubscriptionSettings;
