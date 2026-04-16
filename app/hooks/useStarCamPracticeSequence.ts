import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface StarCamPracticeSequenceItem {
  targetLabel: string;
  pronunciationVideoUrl: string | null;
  sampleImageUrl: string | null;
}

export interface UseStarCamPracticeSequenceParams {
  items: StarCamPracticeSequenceItem[];
  /** Time from "video finished" → "next video starts". Target: 500-1000ms. */
  stepDelayMs?: number;
  /** Duration for the "Next word" notification before it disappears. */
  nextToastMs?: number;
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
  nextIntroText: string | null;
  onVideoLoadStart: () => void;
  onVideoLoad: () => void;
  onVideoError: () => void;
  onPlaybackStatusUpdate: (status: any) => void;
}

export function useStarCamPracticeSequence({
  items,
  stepDelayMs = 900,
  nextToastMs = 500,
  onComplete,
}: UseStarCamPracticeSequenceParams): UseStarCamPracticeSequenceResult {
  const [index, setIndex] = useState(0);
  const [passNumber, setPassNumber] = useState<1 | 2>(1);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isShowingNextIntro, setIsShowingNextIntro] = useState(false);
  const [nextIntroText, setNextIntroText] = useState<string | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIntroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionInProgressRef = useRef(false);

  useEffect(() => {
    setIndex(0);
    setPassNumber(1);
    setIsVideoLoading(Boolean(items?.[0]?.pronunciationVideoUrl));
    setIsShowingNextIntro(false);
    setNextIntroText(null);
    transitionInProgressRef.current = false;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (nextIntroTimerRef.current) clearTimeout(nextIntroTimerRef.current);
  }, [items]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (nextIntroTimerRef.current) clearTimeout(nextIntroTimerRef.current);
    };
  }, []);

  const current = items[index] ?? null;
  const total = items.length || 0;
  const playbackRate = passNumber === 2 ? 1.5 : 1;

  const announceAndAdvance = useCallback(() => {
    if (transitionInProgressRef.current) return;
    transitionInProgressRef.current = true;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (nextIntroTimerRef.current) clearTimeout(nextIntroTimerRef.current);

    const nextItem = items[index + 1] ?? null;
    const isEndOfCurrentPass = !nextItem;
    const isSecondPass = passNumber === 2;
    const nextPass = isEndOfCurrentPass ? ((passNumber === 1 ? 2 : 2) as 1 | 2) : passNumber;
    const nextIndex = isEndOfCurrentPass ? 0 : index + 1;
    const transitionLabel = isEndOfCurrentPass ? items[0]?.targetLabel : nextItem?.targetLabel;

    if (!transitionLabel) {
      onComplete?.();
      transitionInProgressRef.current = false;
      return;
    }

    setIsShowingNextIntro(true);
    setNextIntroText(isEndOfCurrentPass && !isSecondPass ? `Round 2! Next word: ${transitionLabel}` : `Next word: ${transitionLabel}`);

    nextIntroTimerRef.current = setTimeout(() => {
      setIsShowingNextIntro(false);
      setNextIntroText(null);
    }, nextToastMs);

    advanceTimerRef.current = setTimeout(() => {
      if (isEndOfCurrentPass && isSecondPass) {
        onComplete?.();
        transitionInProgressRef.current = false;
        return;
      }
      setPassNumber(nextPass);
      setIndex(nextIndex);
      setIsVideoLoading(Boolean(items?.[nextIndex]?.pronunciationVideoUrl));
      transitionInProgressRef.current = false;
    }, Math.max(stepDelayMs, nextToastMs));
  }, [index, items, nextToastMs, onComplete, passNumber, stepDelayMs]);

  const onVideoLoadStart = useCallback(() => setIsVideoLoading(true), []);
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
    nextIntroText,
    onVideoLoadStart,
    onVideoLoad,
    onVideoError,
    onPlaybackStatusUpdate,
  };
}

