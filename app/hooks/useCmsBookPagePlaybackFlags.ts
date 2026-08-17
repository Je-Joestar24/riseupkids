/**
 * Session + durable CMS page playback flags (audio heard / video played).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  isCmsPageAudioHeard,
  isCmsPageVideoPlayed,
  loadCmsBookPagePlaybackRecord,
  markCmsPagePlaybackFlags,
  type CmsBookPagePlaybackRecord,
  type CmsPagePlaybackFlagReason,
  type CmsPagePlaybackFlags,
} from '@/services/cmsBookPagePlaybackFlags';

export interface UseCmsBookPagePlaybackFlagsOptions {
  bookId: string | null | undefined;
  contentVersion: string | null | undefined;
  enabled: boolean;
}

export interface UseCmsBookPagePlaybackFlagsReturn {
  isAudioHeard: (pageId: string | null | undefined) => boolean;
  isVideoPlayed: (pageId: string | null | undefined) => boolean;
  markAudioHeard: (pageId: string | null | undefined, reason: CmsPagePlaybackFlagReason) => void;
  markVideoPlayed: (pageId: string | null | undefined, reason: CmsPagePlaybackFlagReason) => void;
}

export function useCmsBookPagePlaybackFlags({
  bookId,
  contentVersion,
  enabled,
}: UseCmsBookPagePlaybackFlagsOptions): UseCmsBookPagePlaybackFlagsReturn {
  const [record, setRecord] = useState<CmsBookPagePlaybackRecord | null>(null);

  useEffect(() => {
    if (!enabled || !bookId) {
      setRecord(null);
      return undefined;
    }
    let cancelled = false;
    void loadCmsBookPagePlaybackRecord(bookId, contentVersion).then((next) => {
      if (!cancelled) setRecord(next);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, bookId, contentVersion]);

  const isAudioHeard = useCallback(
    (pageId: string | null | undefined) => isCmsPageAudioHeard(record, pageId),
    [record]
  );

  const isVideoPlayed = useCallback(
    (pageId: string | null | undefined) => isCmsPageVideoPlayed(record, pageId),
    [record]
  );

  const applyPatch = useCallback(
    (pageId: string | null | undefined, patch: Partial<CmsPagePlaybackFlags>) => {
      const id = String(pageId || '').trim();
      if (!enabled || !bookId || !id) return;
      setRecord((prev) => {
        const base: CmsBookPagePlaybackRecord = prev || {
          bookId,
          contentVersion: String(contentVersion || 'unknown'),
          pages: {},
        };
        const current = base.pages[id];
        return {
          ...base,
          pages: {
            ...base.pages,
            [id]: {
              audioHeard: Boolean(patch.audioHeard ?? current?.audioHeard),
              videoPlayed: Boolean(patch.videoPlayed ?? current?.videoPlayed),
              audioReason: patch.audioReason ?? current?.audioReason,
              videoReason: patch.videoReason ?? current?.videoReason,
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
      void markCmsPagePlaybackFlags(bookId, contentVersion, id, patch).then(setRecord);
    },
    [enabled, bookId, contentVersion]
  );

  const markAudioHeard = useCallback(
    (pageId: string | null | undefined, reason: CmsPagePlaybackFlagReason) => {
      applyPatch(pageId, { audioHeard: true, audioReason: reason });
    },
    [applyPatch]
  );

  const markVideoPlayed = useCallback(
    (pageId: string | null | undefined, reason: CmsPagePlaybackFlagReason) => {
      applyPatch(pageId, { videoPlayed: true, videoReason: reason });
    },
    [applyPatch]
  );

  return useMemo(
    () => ({
      isAudioHeard,
      isVideoPlayed,
      markAudioHeard,
      markVideoPlayed,
    }),
    [isAudioHeard, isVideoPlayed, markAudioHeard, markVideoPlayed]
  );
}
