import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  getPlanPricing,
  getChildrenPlanLabel,
  regionToLocale,
  PAYMENT_NOTE,
  MIN_CHILDREN,
} from '../services/checkoutService';

/**
 * Derives Family Plan display data from the authenticated parent user.
 * Pricing locale follows purchase region (planRegion), then app language.
 */
export function useSubscriptionPlan(user) {
  const appLanguage = useSelector((state) => state.language?.current) || 'en';

  return useMemo(() => {
    const status = user?.subscriptionStatus || 'inactive';
    const stripeSubId = user?.stripeSubscriptionId || '';
    const isLegacyStripeSubscription = stripeSubId.startsWith('sub_');
    const isFamilyPlan = user?.planKidsLimit != null;
    const childCount = isFamilyPlan ? user.planKidsLimit : MIN_CHILDREN;
    const locale = user?.planRegion
      ? regionToLocale(user.planRegion)
      : (appLanguage === 'pt' || appLanguage === 'es' ? appLanguage : 'en');

    const planPricing = isFamilyPlan
      ? getPlanPricing(locale, childCount)
      : { line1: '$9.99/mo', line2: 'Legacy monthly subscription', amount: 9.99 };
    const priceLine2 = isFamilyPlan ? (planPricing.line2 ?? PAYMENT_NOTE) : planPricing.line2;

    const startDate = user?.subscriptionStartDate
      ? new Date(user.subscriptionStartDate)
      : user?.createdAt
        ? new Date(user.createdAt)
        : null;

    let accessEndDate = user?.subscriptionCurrentPeriodEnd
      ? new Date(user.subscriptionCurrentPeriodEnd)
      : null;

    if (!accessEndDate && startDate && status === 'active') {
      accessEndDate = new Date(startDate);
      accessEndDate.setFullYear(accessEndDate.getFullYear() + 1);
    }

    const canCancelSubscription =
      status === 'active' &&
      isLegacyStripeSubscription &&
      (() => {
        if (!startDate) return false;
        const oneYearFromStart = new Date(startDate);
        oneYearFromStart.setFullYear(oneYearFromStart.getFullYear() + 1);
        return new Date() >= oneYearFromStart;
      })();

    const cancellationStatus = (() => {
      if (!isLegacyStripeSubscription) {
        return isFamilyPlan
          ? 'Annual program — contact support to cancel or renew'
          : 'N/A';
      }
      if (!accessEndDate) return 'N/A';
      return canCancelSubscription ? 'Available' : 'After one-year commitment';
    })();

    return {
      status,
      isFamilyPlan,
      isActive: status === 'active',
      locale,
      childCount,
      childrenLabel: getChildrenPlanLabel(childCount),
      planPricing,
      priceLine2,
      programTitle: isFamilyPlan ? 'Complete Rise Up Kids Program' : 'Premium Plan',
      programSubtitle: isFamilyPlan
        ? '12 months of immersive English journey • Founding Class 2026'
        : 'Monthly subscription',
      startDate,
      accessEndDate,
      paymentProvider: user?.paymentProvider || (stripeSubId ? 'stripe' : null),
      isLegacyStripeSubscription,
      canCancelSubscription,
      cancellationStatus,
    };
  }, [user, appLanguage]);
}

export default useSubscriptionPlan;
