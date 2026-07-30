/**
 * Journey module lock helpers for child app (admin Module Access + sequential rules).
 * Backend is source of truth; UI keeps the same locked look/copy as before.
 */

export type JourneyModuleAccessInput = {
  status?: string | null;
  accessible?: boolean | null;
  accessOverride?: string | null;
  accessReason?: string | null;
};

/** True when the child must not open this journey step. */
export function isJourneyModuleLocked(item: JourneyModuleAccessInput | null | undefined): boolean {
  if (!item) return true;
  if (item.status === 'completed') return false;
  if (item.accessOverride === 'force_lock') return true;
  if (item.status === 'locked') return true;
  if (item.accessible === false) return true;
  return false;
}
