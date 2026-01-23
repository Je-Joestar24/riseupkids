import React, { useState } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import SubscriptionHeader from './SubscriptionHeader';
import SubscriptionDetails from './SubscriptionDetails';
import SubscriptionBenefits from './SubscriptinoBenefits';
import SubscriptionActions from './SubscriptionActions';
import useAuth from '../../../hooks/userHook';
import stripeService from '../../../services/stripeService';
import { useDispatch } from 'react-redux';
import { showNotification } from '../../../store/slices/uiSlice';
import { getCurrentUser } from '../../../store/slices/userSlice';

/**
 * SubscriptionSettings Component
 * 
 * Main subscription management page
 * Shows current plan, details, benefits, and management options
 * Uses real subscription data from user
 */
const SubscriptionSettings = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const subscriptionData = {
    status: user?.subscriptionStatus || 'inactive',
    startDate: user?.subscriptionStartDate || null,
    currentPeriodEnd: user?.subscriptionCurrentPeriodEnd || null,
    stripeSubscriptionId: user?.stripeSubscriptionId || null,
  };

  // Calculate if cancellation is available (must be at least 1 year old)
  const canCancel = (() => {
    if (!subscriptionData.currentPeriodEnd || subscriptionData.status !== 'active') {
      return false;
    }
    // Use subscriptionStartDate if available, otherwise fallback to createdAt
    const subscriptionStartDate = subscriptionData.startDate 
      ? new Date(subscriptionData.startDate)
      : user?.createdAt 
        ? new Date(user.createdAt)
        : null;
    
    if (!subscriptionStartDate) {
      return false;
    }
    
    const oneYearFromStart = new Date(subscriptionStartDate);
    oneYearFromStart.setFullYear(oneYearFromStart.getFullYear() + 1);
    const now = new Date();
    return now >= oneYearFromStart;
  })();

  const handleCancelPlan = () => {
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    try {
      await stripeService.cancelSubscription();
      dispatch(showNotification({
        message: 'Subscription will be cancelled at the end of the current billing period.',
        type: 'success',
      }));
      // Refresh user data to get updated subscription info
      dispatch(getCurrentUser());
      setCancelDialogOpen(false);
    } catch (error) {
      dispatch(showNotification({
        message: error.response?.data?.message || error.message || 'Failed to cancel subscription',
        type: 'error',
      }));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: '20px', sm: '24px' },
          width: '100%',
        }}
      >
        {/* Header with Plan Status */}
        <SubscriptionHeader subscriptionData={subscriptionData} />

        {/* Plan Details */}
        <SubscriptionDetails subscriptionData={subscriptionData} canCancel={canCancel} user={user} />

        {/* Premium Benefits */}
        <SubscriptionBenefits />

        {/* Action Buttons */}
        <SubscriptionActions
          onCancelPlan={handleCancelPlan}
          canCancel={canCancel}
        />
      </Box>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => !cancelling && setCancelDialogOpen(false)}
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
      >
        <DialogTitle id="cancel-dialog-title">
          Cancel Subscription?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-dialog-description">
            Your subscription will remain active until the end of the current billing period. 
            After that, you will lose access to premium features. Are you sure you want to cancel?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
            Keep Subscription
          </Button>
          <Button onClick={handleConfirmCancel} color="error" disabled={cancelling}>
            {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SubscriptionSettings;
