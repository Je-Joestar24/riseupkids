import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isLocalMediaUri } from '@/components/child/common/cms-player-media';
import {
  hasPlayablePracticeVideo,
  type StarCamPracticeSequenceItem,
} from '@/services/starCamPracticeMedia';

export type { StarCamPracticeSequenceItem };

export interface UseStarCamPracticeSequenceParams {
  items: StarCamPracticeSequenceItem[];
  /** Time from "video finished" → "next video starts". Target: 500-1000ms. */
  stepDelayMs?: number;
  /** Duration for the "Next word" notification before it disappears. */
  nextToastMs?: number;
  /** Delay when auto-skipping items that have no practice video. */
  missingVideoSkipDelayMs?: number;
  onComplete?: () => void;
}

export interface UseStarCamPracticeSequenceResult {
  index: number;
  total: number;
  passNumber: 1 | 2;
  playbackRate: number;
  current: StarCamPracticeSequenceItem | null;
  progressText: string;
  isVideoLoading: boolean;
  isShowingNextIntro: boolean;
  isShowingMissingVideoSkip: boolean;
  nextIntroText: string | null;
  onVideoLoadStart: () => void;
  onVideoLoad: () => void;
  onVideoError: () => void;
  onPlaybackStatusUpdate: (status: any) => void;
  skipToNext: () => void;
}

const shouldShowVideoLoading = (item: StarCamPracticeSequenceItem | null | undefined) =>
  hasPlayablePracticeVideo(item) && !isLocalMediaUri(item?.pronunciationVideoUrl ?? null);

export function useStarCamPracticeSequence({
  items,
  stepDelayMs = 900,
  nextToastMs = 500,
  missingVideoSkipDelayMs = 500,
  onComplete,
}: UseStarCamPracticeSequenceParams): UseStarCamPracticeSequenceResult {
  const [index, setIndex] = useState(0);
  const [passNumber, setPassNumber] = useState<1 | 2>(1);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isShowingNextIntro, setIsShowingNextIntro] = useState(false);
  const [isShowingMissingVideoSkip, setIsShowingMissingVideoSkip] = useState(false);
  const [nextIntroText, setNextIntroText] = useState<string | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIntroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionInProgressRef = useRef(false);
  const hasAnyPlayableVideo = useMemo(
    () => items.some((item) => hasPlayablePracticeVideo(item)),
    [items]
  );

  useEffect(() => {
    setIndex(0);
    setPassNumber(1);
    setIsVideoLoading(shouldShowVideoLoading(items[0] ?? null));
    setIsShowingNextIntro(false);
    setIsShowingMissingVideoSkip(false);
    setNextIntroText(null);
    transitionInProgressRef.current = false;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (nextIntroTimerRef.current) clearTimeout(nextIntroTimerRef.current);
  }, [items]);

  useEffect(() => {
    if (!items.length) {
      onComplete?.();
      return;
    }
    if (!hasAnyPlayableVideo) {
      onComplete?.();
    }
  }, [hasAnyPlayableVideo, items.length, onComplete]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (nextIntroTimerRef.current) clearTimeout(nextIntroTimerRef.current);
    };
  }, []);

  const current = items[index] ?? null;
  const total = items.length || 0;
  const playbackRate = passNumber === 2 ? 1.5 : 1;

  const announceAndAdvance = useCallback((options?: { silent?: boolean }) => {
    if (transitionInProgressRef.current) return;
    transitionInProgressRef.current = true;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (nextIntroTimerRef.current) clearTimeout(nextIntroTimerRef.current);

    const silent = options?.silent ?? false;
    const nextItem = items[index + 1] ?? null;
    const isEndOfCurrentPass = !nextItem;
    const isSecondPass = passNumber === 2;
    const nextPass = isEndOfCurrentPass ? ((passNumber === 1 ? 2 : 2) as 1 | 2) : passNumber;
    const nextIndex = isEndOfCurrentPass ? 0 : index + 1;
    const transitionLabel = isEndOfCurrentPass ? items[0]?.targetLabel : nextItem?.targetLabel;

    const finishAdvance = () => {
      setIsShowingMissingVideoSkip(false);
      if (isEndOfCurrentPass && isSecondPass) {
        onComplete?.();
        transitionInProgressRef.current = false;
        return;
      }
      setPassNumber(nextPass);
      setIndex(nextIndex);
      setIsVideoLoading(shouldShowVideoLoading(items[nextIndex] ?? null));
      transitionInProgressRef.current = false;
    };

    if (!transitionLabel) {
      onComplete?.();
      transitionInProgressRef.current = false;
      return;
    }

    if (silent) {
      advanceTimerRef.current = setTimeout(finishAdvance, missingVideoSkipDelayMs);
      return;
    }

    setIsShowingNextIntro(true);
    setNextIntroText(
      isEndOfCurrentPass && !isSecondPass
        ? `Round 2! Next word: ${transitionLabel}`
        : `Next word: ${transitionLabel}`
    );

    nextIntroTimerRef.current = setTimeout(() => {
      setIsShowingNextIntro(false);
      setNextIntroText(null);
    }, nextToastMs);

    advanceTimerRef.current = setTimeout(finishAdvance, Math.max(stepDelayMs, nextToastMs));
  }, [index, items, missingVideoSkipDelayMs, nextToastMs, onComplete, passNumber, stepDelayMs]);

  useEffect(() => {
    if (!items.length || !hasAnyPlayableVideo) return;
    if (transitionInProgressRef.current) return;

    if (hasPlayablePracticeVideo(current)) {
      setIsShowingMissingVideoSkip(false);
      return;
    }

    setIsShowingMissingVideoSkip(true);
    announceAndAdvance({ silent: true });
  }, [announceAndAdvance, current, hasAnyPlayableVideo, index, items.length, passNumber]);

  const onVideoLoadStart = useCallback(() => {
    if (isLocalMediaUri(current?.pronunciationVideoUrl ?? null)) return;
    setIsVideoLoading(true);
  }, [current?.pronunciationVideoUrl]);
  const onVideoLoad = useCallback(() => setIsVideoLoading(false), []);

  const onVideoError = useCallback(() => {
    setIsVideoLoading(false);
    // If video fails, still keep the flow moving.
    announceAndAdvance();
  }, [announceAndAdvance]);

  const onPlaybackStatusUpdate = useCallback(
    (status: any) => {
      if (!status || typeof status !== 'object') return;
      if (status.didJustFinish) {
        announceAndAdvance();
      }
    },
    [announceAndAdvance]
  );

  const skipToNext = useCallback(() => {
    announceAndAdvance();
  }, [announceAndAdvance]);

  const progressText = useMemo(() => {
    if (total <= 0) return '0/0';
    return `${Math.min(total, index + 1)}/${total}`;
  }, [index, total]);

  return {
    index,
    total,
    passNumber,
    playbackRate,
    current,
    progressText,
    isVideoLoading,
    isShowingNextIntro,
    isShowingMissingVideoSkip,
    nextIntroText,
    onVideoLoadStart,
    onVideoLoad,
    onVideoError,
    onPlaybackStatusUpdate,
    skipToNext,
  };
}
