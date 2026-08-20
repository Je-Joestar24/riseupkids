/**
 * Phase 2 stub. Phase 3 replaces this with Expo/FCM delivery.
 * Secrets must stay backend-only when the real provider is wired.
 */
async function deliverPush() {
  return {
    status: 'skipped',
    reason: 'push_provider_not_configured',
  };
}

module.exports = {
  deliverPush,
};
