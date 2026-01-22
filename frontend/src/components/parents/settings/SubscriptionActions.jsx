import React from 'react';
import { Box, Button } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * SubscriptionActions Component
 * 
 * Action buttons for subscription management
 * (Update Payment and Cancel Plan)
 */
const SubscriptionActions = ({ onUpdatePayment, onCancelPlan }) => {
  const handleUpdatePayment = () => {
    console.log('Update payment clicked');
    if (onUpdatePayment) {
      onUpdatePayment();
    }
    // TODO: Implement Stripe payment update
  };

  const handleCancelPlan = () => {
    console.log('Cancel plan clicked');
    if (onCancelPlan) {
      onCancelPlan();
    }
    // TODO: Implement cancel plan confirmation
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: '12px', sm: '16px' },
      }}
    >
      {/* Update Payment Button */}
      <Button
        onClick={handleUpdatePayment}
        fullWidth
        sx={{
          flex: 1,
          backgroundColor: 'white',
          color: themeColors.orange,
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '16px', sm: '18px' },
          fontWeight: 600,
          textTransform: 'none',
          borderRadius: { xs: '16px', sm: '20px' },
          padding: { xs: '12px 16px', sm: '14px 20px' },
          border: `2px solid ${themeColors.orange}`,
          boxShadow: '0 2px 8px rgba(233, 138, 104, 0.15)',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(233, 138, 104, 0.05)',
            boxShadow: '0 4px 12px rgba(233, 138, 104, 0.25)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        }}
      >
        Update Payment
      </Button>

      {/* Cancel Plan Button */}
      <Button
        onClick={handleCancelPlan}
        fullWidth
        sx={{
          flex: 1,
          backgroundColor: 'white',
          color: themeColors.orange,
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '16px', sm: '18px' },
          fontWeight: 600,
          textTransform: 'none',
          borderRadius: { xs: '16px', sm: '20px' },
          padding: { xs: '12px 16px', sm: '14px 20px' },
          border: `2px solid ${themeColors.orange}`,
          boxShadow: '0 2px 8px rgba(233, 138, 104, 0.15)',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(233, 138, 104, 0.05)',
            boxShadow: '0 4px 12px rgba(233, 138, 104, 0.25)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        }}
      >
        Cancel Plan
      </Button>
    </Box>
  );
};

export default SubscriptionActions;
