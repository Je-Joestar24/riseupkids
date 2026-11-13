/**
 * Experience Hook (App)
 *
 * The published experiences for the child's screens: the list (loads on mount, shows the last answer at
 * once on later visits, reloads after the no-internet dialog reconnects) and one experience's own page.
 */

import { useCallback, useEffect, useState } from 'react';

import { getCoverImageUrl } from '@/components/child/module/module-utils';
import { useOnNetworkReconnect } from '@/hooks/useOnNetworkReconnect';
import type { ExperienceCardData, ExperienceDetailData } from '@/services/experienceService';
import { useExperienceStore } from '@/store/experienceStore';

export interface UseExperiencesReturn {
  experiences: ExperienceCardData[];
  /** Nothing to show yet and still waiting (first visit only). */
  loading: boolean;
  /** Set only while nothing has loaded. */
  error: string | null;
  retry: () => void;
  getCoverImageUrl: (path: string | null | undefined) => string | null;
}

export function useExperiences(): UseExperiencesReturn {
  const experiences = useExperienceStore((s) => s.experiences);
  const loaded = useExperienceStore((s) => s.loaded);
  const error = useExperienceStore((s) => s.error);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    useExperienceStore.getState().fetchExperiences().catch(() => undefined);
  }, [retryKey]);

  useOnNetworkReconnect(() => setRetryKey((n) => n + 1));

  const retry = useCallback(() => setRetryKey((n) => n + 1), []);

  return {
    experiences,
    loading: !loaded && !error,
    error,
    retry,
    getCoverImageUrl,
  };
}

export interface UseExperienceReturn {
  experience: ExperienceDetailData | null;
  /** Nothing to show yet and still waiting (first visit to this experience only). */
  loading: boolean;
  /** Set only while nothing has loaded for this experience, and never for "not available". */
  error: string | null;
  /** The server says this experience does not exist or is not published: nothing to try again. */
  notFound: boolean;
  retry: () => void;
  getImageUrl: (path: string | null | undefined) => string | null;
}

/** One experience for its page. With no id nothing is requested and nothing is "loading". */
export function useExperience(uuid: string | undefined): UseExperienceReturn {
  const experience = useExperienceStore((s) => (uuid ? s.details[uuid] ?? null : null));
  const error = useExperienceStore((s) => (uuid ? s.detailErrors[uuid] ?? null : null));
  const notFound = useExperienceStore((s) => (uuid ? Boolean(s.detailsNotFound[uuid]) : false));
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!uuid) return;
    useExperienceStore.getState().fetchExperience(uuid).catch(() => undefined);
  }, [uuid, retryKey]);

  useOnNetworkReconnect(() => setRetryKey((n) => n + 1));

  const retry = useCallback(() => setRetryKey((n) => n + 1), []);

  return {
    experience,
    loading: Boolean(uuid) && !experience && !error && !notFound,
    error: experience ? null : error,
    notFound: experience ? false : notFound,
    retry,
    getImageUrl: getCoverImageUrl,
  };
}
