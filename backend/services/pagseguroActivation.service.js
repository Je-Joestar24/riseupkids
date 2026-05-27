/**
 * Activate parent subscription after verified PagBank Checkout payment.
 */

const User = require('../models/User');

/**
 * @param {import('../models/PagSeguroCheckout')} checkoutDoc
 * @param {{ chargeId?: string, setTermsIp?: string|null }} [options]
 * @returns {Promise<{ activated: boolean, alreadyActive: boolean }>}
 */
async function activateUserFromPagseguroCheckout(checkoutDoc, options = {}) {
  const { chargeId, setTermsIp } = options;

  if (!checkoutDoc?.userId || !checkoutDoc.pagbankCheckoutId) {
    throw new Error('Invalid PagSeguro checkout record for activation.');
  }

  const user = await User.findById(checkoutDoc.userId).select(
    '+pagseguroCheckoutId +pagseguroChargeId +subscriptionStatus +subscriptionStartDate +subscriptionCurrentPeriodEnd +planKidsLimit +planRegion +paymentProvider +termsAcceptedAt +termsVersion +taxId'
  );

  if (!user) {
    throw new Error('User not found for PagSeguro checkout activation.');
  }

  const alreadyActive =
    user.subscriptionStatus === 'active' &&
    user.paymentProvider === 'pagseguro' &&
    user.pagseguroCheckoutId === checkoutDoc.pagbankCheckoutId;

  if (alreadyActive) {
    return { activated: false, alreadyActive: true };
  }

  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  user.subscriptionStatus = 'active';
  user.subscriptionStartDate = user.subscriptionStartDate || now;
  user.subscriptionCurrentPeriodEnd = oneYearLater;
  user.planKidsLimit = checkoutDoc.childCount;
  user.planRegion = 'br';
  user.paymentProvider = 'pagseguro';
  user.subscriptionPlan = 'yearly';
  user.pagseguroCheckoutId = checkoutDoc.pagbankCheckoutId;
  if (chargeId) {
    user.pagseguroChargeId = chargeId;
  }

  if (!user.termsAcceptedAt) {
    user.termsAcceptedAt = now;
  }
  if (checkoutDoc.termsVersion && !user.termsVersion) {
    user.termsVersion = checkoutDoc.termsVersion;
  }
  if (setTermsIp && !user.termsAcceptedIp) {
    user.termsAcceptedIp = setTermsIp;
  }

  await user.save();

  if (checkoutDoc.status !== 'paid') {
    checkoutDoc.status = 'paid';
    checkoutDoc.paidAt = checkoutDoc.paidAt || now;
    await checkoutDoc.save();
  }

  console.log(
    '[PagSeguro] User activated – userId=%s, checkoutId=%s, planKidsLimit=%s',
    user._id.toString(),
    checkoutDoc.pagbankCheckoutId,
    checkoutDoc.childCount
  );

  return { activated: true, alreadyActive: false };
}

module.exports = {
  activateUserFromPagseguroCheckout,
};
