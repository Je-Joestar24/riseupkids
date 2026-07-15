import { useCallback, useEffect, useState } from 'react';

import { parentChildService, type ChildProfile } from '@/services/parentChildService';
import { resolveKidsWallEnabled } from '@/utils/kidsWallConsent';

export function useChildProfile(childId: string | null | undefined) {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(childId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!childId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await parentChildService.getChildById(childId);
      setProfile(res.data ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load child profile';
      setError(message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    profile,
    loading,
    error,
    refresh,
    kidsWallEnabled: resolveKidsWallEnabled(profile),
  };
}

export default useChildProfile;
