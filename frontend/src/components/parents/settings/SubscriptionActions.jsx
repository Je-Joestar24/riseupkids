import React from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * SubscriptionActions Component
 * 
 * Action buttons for subscription management
 * (Cancel Plan only - Update Payment removed)
 */
const SubscriptionActions = ({ onCancelPlan, canCancel }) => {
  const handleCancelPlan = () => {
    if (onCancelPlan) {
      onCancelPlan();
    }
  };

  const cancelButton = (
    <Button
      onClick={handleCancelPlan}
      fullWidth
      disabled={!canCancel}
      sx={{
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
          backgroundColor: canCancel ? 'rgba(233, 138, 104, 0.05)' : 'transparent',
          boxShadow: canCancel ? '0 4px 12px rgba(233, 138, 104, 0.25)' : '0 2px 8px rgba(233, 138, 104, 0.15)',
        },
        '&:active': {
          transform: canCancel ? 'scale(0.98)' : 'none',
        },
        '&:disabled': {
          opacity: 0.5,
          cursor: 'not-allowed',
        },
      }}
    >
      Cancel Plan
    </Button>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: '12px', sm: '16px' },
      }}
    >
      {/* Cancel Plan Button */}
      {!canCancel ? (
        <Tooltip 
          title="Cancellation will be available after the one-year commitment period is complete"
          arrow
        >
          <Box sx={{ width: '100%' }}>
            {cancelButton}
          </Box>
        </Tooltip>
      ) : (
        cancelButton
      )}
    </Box>
  );
};

export default SubscriptionActions;
