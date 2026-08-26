import { useCallback, useEffect, useMemo, useState } from 'react';

import { homeService } from '@/services/homeService';
import { useOnNetworkReconnect } from '@/hooks/useOnNetworkReconnect';

type Meeting = any;
type YouTubeLive = any;

interface UseHomeDataState {
  loading: boolean;
  error: string | null;
  totalStars: number;
  learningTimeHours: number;
  nextMeeting: Meeting | null;
  activeLive: YouTubeLive | null;
  refresh: () => Promise<void>;
}

export function useHomeData(childId?: string | null): UseHomeDataState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalStars, setTotalStars] = useState(0);
  const [learningTimeHours, setLearningTimeHours] = useState(0);
  const [nextMeeting, setNextMeeting] = useState<Meeting | null>(null);
  const [activeLive, setActiveLive] = useState<YouTubeLive | null>(null);

  const refresh = useCallback(async () => {
    if (!childId) return;

    setLoading(true);
    setError(null);

    try {
      const [progressRes, meetingsRes, liveRes] = await Promise.all([
        homeService.getChildProgress(childId),
        homeService.getUpcomingMeetings(1),
        homeService.getActiveLive(),
      ]);

      setTotalStars(progressRes?.data?.totalStars ?? 0);
      setLearningTimeHours(progressRes?.data?.learningTimeHours ?? 0);
      setNextMeeting(Array.isArray(meetingsRes?.data) && meetingsRes.data.length > 0 ? meetingsRes.data[0] : null);
      setActiveLive(liveRes?.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load home data');
      setNextMeeting(null);
      setActiveLive(null);
      setTotalStars(0);
      setLearningTimeHours(0);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useOnNetworkReconnect(() => {
    void refresh();
  });

  return useMemo(
    () => ({
      loading,
      error,
      totalStars,
      learningTimeHours,
      nextMeeting,
      activeLive,
      refresh,
    }),
    [loading, error, totalStars, learningTimeHours, nextMeeting, activeLive, refresh]
  );
}

