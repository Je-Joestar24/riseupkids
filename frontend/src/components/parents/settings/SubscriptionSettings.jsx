import React, { useState } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import SubscriptionHeader from './SubscriptionHeader';
import SubscriptionDetails from './SubscriptionDetails';
import SubscriptionBenefits from './SubscriptinoBenefits';
import SubscriptionActions from './SubscriptionActions';
import useAuth from '../../../hooks/userHook';
import useSubscriptionPlan from '../../../hooks/useSubscriptionPlan';
import stripeService from '../../../services/stripeService';
import { useDispatch } from 'react-redux';
import { showNotification } from '../../../store/slices/uiSlice';
import { getCurrentUser } from '../../../store/slices/userSlice';

/**
 * Subscription settings — Family Plan (checkout) display and legacy Stripe cancel.
 */
const SubscriptionSettings = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const plan = useSubscriptionPlan(user);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const planWithRegion = { ...plan, userRegion: user?.planRegion };

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
        <SubscriptionHeader plan={planWithRegion} />

        <SubscriptionDetails plan={planWithRegion} />

        <SubscriptionBenefits />

        {plan.isLegacyStripeSubscription && (
          <SubscriptionActions
            onCancelPlan={handleCancelPlan}
            canCancel={plan.canCancelSubscription}
          />
        )}
      </Box>

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
