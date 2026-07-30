/**
 * Journey module lock helpers for child web (admin Module Access + sequential rules).
 * Lock/unlock is enforced internally; UI copy stays the normal locked-step messaging.
 */

export function isJourneyModuleLocked(item) {
  if (!item) return true;
  if (item.status === 'completed') return false;
  if (item.accessOverride === 'force_lock') return true;
  if (item.status === 'locked') return true;
  if (item.accessible === false) return true;
  return false;
}
