import { useCallback, useEffect, useState } from 'react';

import childrenService from '../services/childrenService';

function readSelectedChild(childId) {
  try {
    const raw = sessionStorage.getItem('selectedChild');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?._id === childId) return parsed;
  } catch {
    // ignore invalid session storage
  }
  return null;
}

/**
 * Loads child profile for child routes (Kids Wall consent, etc.).
 */
export function useChildProfile(childId) {
  const [profile, setProfile] = useState(() => readSelectedChild(childId));
  const [loading, setLoading] = useState(Boolean(childId));
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!childId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await childrenService.getChildById(childId);
      const data = response?.data ?? null;
      setProfile(data);
      if (data) {
        sessionStorage.setItem('selectedChild', JSON.stringify(data));
      }
    } catch (err) {
      setError(err?.message || 'Failed to load child profile');
      setProfile(readSelectedChild(childId));
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
    kidsWallEnabled: profile?.kidsWallEnabled !== false,
  };
}

export default useChildProfile;
