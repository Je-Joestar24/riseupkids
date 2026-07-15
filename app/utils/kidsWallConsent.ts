import type { ChildProfile } from '@/services/parentChildService';

export function resolveKidsWallEnabled(
  profile: Pick<ChildProfile, 'kidsWallEnabled'> | null | undefined
): boolean {
  return profile?.kidsWallEnabled === true;
}
