/**
 * CMS built-in book modal — layout parity with web CmsBooksModalPlayer + CmsBooksModalPlayer.jsx.
 * Stage is always 16:9 (1920×1080 design space). Landscape while open (no portrait player UI); preload + caching.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Quicksand } from '@/constants/theme';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';
import {
  preloadCmsBookPackAssets,
  type PreloadCmsBookPackResult,
} from '@/services/cmsBookMediaCache';
import { loadBookPackForPreload } from '@/services/cmsBookPackStorage';
import {
  resolveCmsBookMediaManifest,
  type CmsBookMediaManifest,
} from '@/services/cmsBookMediaManifest';
import type { CmsPlayableBookDetail } from '@/services/cmsBooksPlayerService';
import {
  CMS_BOOK_PLAYER_MODAL_ORIENTATIONS,
  prepareCmsPlayerOrientation,
  restoreAppPortraitOrientation,
} from '@/utils/cmsPlayerOrientation';
import { ensureCmsPlaybackAudioMode } from '@/utils/cmsPlaybackAudio';

import {
  collectCmsPlayerMediaUrls,
  preloadCmsPlayerAssets,
  type CmsMediaUriMap,
} from './cms-player-media';
import { CmsMediaUriProvider } from './cms-player-media-context';
import { CmsInteractivePage } from './cms-player-interactive';
import { CmsPlayerLoadingSpinner } from './cms-player-loading-spinner';
import { CmsContentPage, CmsDemoPage, CmsIntroPage } from './cms-player-pages';
import {
  computeStageSize,
  cmsLocalUiAssets,
  getPlayablePages,
  resolvePageType,
} from './cms-player-shared';
import { CmsRewardStage } from './cms-reward-dialog';

/** Right rail for close; stage uses remaining width + full window height. */
const CLOSE_RAIL = 44;
const ROW_GAP = 6;

export { lockLandscapeForCmsBookPlayer } from '@/utils/cmsPlayerOrientation';

export interface CmsSessionPayload {
  score: number;
  maxScore: number;
  attemptCount: number;
  totalPages: number;
  completedInteractivePages: number;
  trigger: 'close' | 'home';
}

export interface CmsPlayerModalProps {
  open: boolean;
  onClose: () => void;
  pages: CmsPlayablePage[];
  /** Loaded book detail — enables durable pack preload with contentVersion checks. */
  book?: CmsPlayableBookDetail | null;
  /** Controlled preload: when set, auto preload inside modal is skipped for this cycle. */
  isPreloading?: boolean;
  preloadProgress?: number;
  preloadSummary?: { failed?: string[] } | null;
  onSessionComplete?: (payload: CmsSessionPayload) => void | Promise<void>;
  /** When true (default), preload media when `open` becomes true. */
  autoPreload?: boolean;
}

function usePagesSignature(pages: CmsPlayablePage[]): string {
  return useMemo(
    () => (pages || []).map((p) => p.pageId).join('|'),
    [pages]
  );
}

export function CmsPlayerModal({
  open,
  onClose,
  pages = [],
  book = null,
  isPreloading: controlledPreloading,
  preloadProgress: controlledProgress = 0,
  preloadSummary: controlledSummary = null,
  onSessionComplete,
  autoPreload = true,
}: CmsPlayerModalProps) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const signature = usePagesSignature(pages);

  const playablePages = useMemo(() => getPlayablePages(pages), [pages]);
  const interactivePages = useMemo(
    () => playablePages.filter((page) => resolvePageType(page?.type) === 'interactive'),
    [playablePages]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolvedPageIds, setResolvedPageIds] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizingTrigger, setFinalizingTrigger] = useState<'close' | 'home' | null>(null);

  const [internalProgress, setInternalProgress] = useState(0);
  const [internalSummary, setInternalSummary] = useState<{ failed: string[] } | null>(null);
  const [mediaUriMap, setMediaUriMap] = useState<CmsMediaUriMap>({});
  const [mediaReady, setMediaReady] = useState(false);

  const isControlledPreload = controlledPreloading !== undefined;
  const usesInternalPreload = open && autoPreload && !isControlledPreload;
  const isPreloading = isControlledPreload
    ? Boolean(controlledPreloading)
    : usesInternalPreload && !mediaReady;
  const preloadProgress = isControlledPreload ? controlledProgress : internalProgress;
  const preloadSummary = isControlledPreload ? controlledSummary : internalSummary;

  const preloadCancelled = useRef(false);

  useEffect(() => {
    if (!open) {
      void restoreAppPortraitOrientation();
      return;
    }

    void (async () => {
      await prepareCmsPlayerOrientation();
      await ensureCmsPlaybackAudioMode();
    })();

    return () => {
      void restoreAppPortraitOrientation();
    };
  }, [open]);

  const bookManifest = useMemo(
    (): CmsBookMediaManifest | null => resolveCmsBookMediaManifest(book),
    [book]
  );
  const bookPreloadKey = useMemo(
    () => (book?.id ? `${book.id}:${bookManifest?.contentVersion ?? book.version ?? 0}` : signature),
    [book?.id, book?.version, bookManifest?.contentVersion, signature]
  );

  useEffect(() => {
    if (!usesInternalPreload) {
      if (!open) {
        setMediaReady(false);
        setMediaUriMap({});
      }
      return;
    }

    preloadCancelled.current = false;
    setInternalProgress(0);
    setInternalSummary(null);

    const runPreload = async () => {
      if (book?.id && bookManifest?.assets?.length) {
        const packState = await loadBookPackForPreload(
          book.id,
          bookManifest.contentVersion ?? null
        );
        if (preloadCancelled.current) return;

        if (packState.fullyRestored) {
          setMediaUriMap(packState.uriMap);
          setInternalProgress(100);
          setMediaReady(true);
          return;
        }

        setMediaReady(false);
        setMediaUriMap({});

        const result: PreloadCmsBookPackResult = await preloadCmsBookPackAssets({
          bookId: book.id,
          contentVersion: bookManifest.contentVersion ?? null,
          assets: bookManifest.assets,
          onProgress: (pct) => {
            if (!preloadCancelled.current) setInternalProgress(pct);
          },
          concurrency: 4,
        });
        if (preloadCancelled.current) return;
        setInternalSummary({ failed: result.failed });
        setMediaUriMap(result.uriMap);
        setInternalProgress(100);
        setMediaReady(true);
        return;
      }

      const urls = collectCmsPlayerMediaUrls(playablePages);
      if (!urls.length) {
        setInternalProgress(100);
        setInternalSummary(null);
        setMediaReady(true);
        return;
      }

      setMediaReady(false);
      setMediaUriMap({});

      const summary = await preloadCmsPlayerAssets(urls, (pct) => {
        if (!preloadCancelled.current) setInternalProgress(pct);
      });
      if (preloadCancelled.current) return;
      setInternalSummary({ failed: summary.failed });
      setMediaUriMap(summary.uriMap);
      setInternalProgress(100);
      setMediaReady(true);
    };

    void runPreload();

    return () => {
      preloadCancelled.current = true;
    };
  }, [open, usesInternalPreload, bookPreloadKey, playablePages, book?.id, bookManifest]);

  useEffect(() => {
    if (!open) {
      setCurrentIndex(0);
      setResolvedPageIds({});
      setScore(0);
      setAttemptCount(0);
      setIsFinalizing(false);
      setFinalizingTrigger(null);
      setMediaReady(false);
      setMediaUriMap({});
    }
  }, [open, signature]);

  const currentPage = playablePages[currentIndex] || null;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < playablePages.length - 1;

  const goToIndex = useCallback((nextIndex: number) => {
    setCurrentIndex(nextIndex);
  }, []);

  const goNext = useCallback(() => {
    if (isPreloading || !hasNext) return;
    goToIndex(currentIndex + 1);
  }, [isPreloading, hasNext, currentIndex, goToIndex]);

  const goPrev = useCallback(() => {
    if (isPreloading || !hasPrev) return;
    goToIndex(currentIndex - 1);
  }, [isPreloading, hasPrev, currentIndex, goToIndex]);

  const markPageScored = useCallback((page: CmsPlayablePage) => {
    const pageId = page?.pageId;
    if (!pageId || resolvedPageIds[pageId]) return;
    setResolvedPageIds((prev) => ({ ...prev, [pageId]: true }));
    setScore((prev) => prev + 1);
  }, [resolvedPageIds]);

  const handleInteractiveRetry = useCallback(() => {
    if (isPreloading) return;
    setAttemptCount((prev) => prev + 1);
  }, [isPreloading]);

  const handleInteractiveCorrect = useCallback(() => {
    if (isPreloading || !currentPage) return;
    setAttemptCount((prev) => prev + 1);
    markPageScored(currentPage);
    goNext();
  }, [isPreloading, currentPage, markPageScored, goNext]);

  const buildSessionPayload = useCallback(
    (): CmsSessionPayload => ({
      score,
      maxScore: interactivePages.length || 0,
      attemptCount,
      totalPages: playablePages.length,
      completedInteractivePages: Object.keys(resolvedPageIds).length,
      trigger: 'close',
    }),
    [score, interactivePages.length, attemptCount, playablePages.length, resolvedPageIds]
  );

  const finalizeAndClose = useCallback(
    async (trigger: 'close' | 'home') => {
      if (isFinalizing) return;
      setFinalizingTrigger(trigger);
      setIsFinalizing(true);
      const payload = { ...buildSessionPayload(), trigger };
      try {
        await Promise.resolve(onSessionComplete?.(payload));
      } finally {
        setCurrentIndex(0);
        setResolvedPageIds({});
        setScore(0);
        setAttemptCount(0);
        setIsFinalizing(false);
        setFinalizingTrigger(null);
        void restoreAppPortraitOrientation();
        onClose?.();
      }
    },
    [isFinalizing, buildSessionPayload, onSessionComplete, onClose]
  );

  const handleClose = useCallback(() => {
    finalizeAndClose('close');
  }, [finalizeAndClose]);

  const horizontalInset = Math.max(insets.left, insets.right, spacing[2]);
  /** Full window height for stage (status/nav bars often remain visible). */
  const rootPadTop = 0;
  const rootPadBottom = 0;

  const { width: stageW, height: stageH } = useMemo(() => {
    const rowInnerWidth = Math.max(0, winW - horizontalInset * 2);
    // Symmetric left spacer + right close rail, each CLOSE_RAIL wide, with row gap between the three columns.
    const centerMaxWidth = Math.max(0, rowInnerWidth - CLOSE_RAIL * 2 - ROW_GAP * 2);
    const availableHeight = Math.max(0, winH);
    return computeStageSize(centerMaxWidth, availableHeight);
  }, [winW, winH, horizontalInset]);

  const renderPreloading = () => (
    <View style={[styles.stageShell, { width: stageW, height: stageH }]}>
      <LinearGradient
        colors={['#fffaf2', '#fff3e6']}
        style={styles.preloadFill}
      >
        <View
          style={styles.preloadCard}
          accessibilityRole="progressbar"
          accessibilityLabel="Loading all media assets for smooth playback"
        >
          <Text style={styles.preloadTitle}>Loading all content...</Text>
          <Text style={styles.preloadSubtitle}>
            Preparing media for smooth playback. Please wait.
          </Text>
          <View style={styles.progressTrack} accessibilityLabel="Media preload progress">
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(0, Math.min(100, Number(preloadProgress) || 0))}%` },
              ]}
            />
          </View>
          <Text style={styles.preloadPct}>
            {Math.max(0, Math.min(100, Math.round(Number(preloadProgress) || 0)))}% loaded
          </Text>
          {preloadSummary?.failed?.length ? (
            <Text style={styles.preloadWarn}>
              Some files could not be preloaded, but playback will still continue.
            </Text>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );

  const renderEmpty = () => (
    <View style={[styles.stageShell, { width: stageW, height: stageH, justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={styles.emptyText}>No pages to play yet.</Text>
    </View>
  );

  const renderPageBody = () => {
    if (isPreloading) return renderPreloading();
    if (!currentPage) return renderEmpty();

    const pageType = resolvePageType(currentPage.type);

    if (pageType === 'content') {
      return (
        <CmsContentPage
          page={currentPage}
          hasPrev={hasPrev}
          hasNext={hasNext}
          isPreloading={isPreloading}
          onPrev={goPrev}
          onNext={goNext}
        />
      );
    }
    if (pageType === 'intro') {
      return (
        <CmsIntroPage
          key={currentPage.pageId || `intro-${currentIndex}`}
          page={currentPage}
          hasNext={hasNext}
          isPreloading={isPreloading}
          onNext={goNext}
        />
      );
    }
    if (pageType === 'demo') {
      return (
        <CmsDemoPage
          page={currentPage}
          bookId={book?.id ?? null}
          hasNext={hasNext}
          isPreloading={isPreloading}
          onNext={goNext}
        />
      );
    }
    if (pageType === 'interactive') {
      return (
        <CmsInteractivePage
          key={currentPage.pageId || `interactive-${currentIndex}`}
          page={currentPage}
          isPreloading={isPreloading}
          onRetry={handleInteractiveRetry}
          onCorrectDrop={handleInteractiveCorrect}
        />
      );
    }
    if (pageType === 'reward') {
      return <CmsRewardStage page={currentPage} bookId={book?.id ?? null} />;
    }
    return renderEmpty();
  };

  const isRewardPage =
    !isPreloading && Boolean(currentPage) && resolvePageType(currentPage?.type) === 'reward';

  const finalizingMessage =
    finalizingTrigger === 'home'
      ? 'Saving your book and going home...'
      : 'Saving your progress...';

  const stageView = (
    <CmsMediaUriProvider uriMap={mediaUriMap}>
      <View
        style={[
          styles.stageFrame,
          {
            width: stageW,
            height: stageH,
          },
        ]}
        accessibilityRole="none"
      >
        {renderPageBody()}
      </View>
    </CmsMediaUriProvider>
  );

  return (
    <Modal
      visible={open}
      animationType="fade"
      presentationStyle="fullScreen"
      supportedOrientations={
        Platform.OS === 'ios' ? [...CMS_BOOK_PLAYER_MODAL_ORIENTATIONS] : undefined
      }
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.root,
          {
            paddingTop: rootPadTop,
            paddingBottom: rootPadBottom,
            paddingLeft: horizontalInset,
            paddingRight: horizontalInset,
          },
        ]}
      >
        <View style={styles.playerRow}>
          <View
            style={styles.sideRailSpacer}
            pointerEvents="none"
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
          <View style={styles.stageCenter}>{stageView}</View>

          <View style={[styles.sideRail, styles.sideRailFlushTop, isRewardPage && styles.sideRailReward]}>
            <Pressable
              onPress={handleClose}
              disabled={isFinalizing}
              style={({ pressed }) => [styles.railIconBtn, pressed && styles.pressed]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close book player"
              accessibilityState={{ disabled: isFinalizing }}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
            </Pressable>

            {isRewardPage ? (
              <View style={styles.railHomeBtn} accessibilityRole="none">
                {isFinalizing ? (
                  <CmsPlayerLoadingSpinner
                    size={36}
                    accessibilityLabel={finalizingMessage}
                  />
                ) : (
                  <Pressable
                    onPress={() => finalizeAndClose('home')}
                    hitSlop={14}
                    style={({ pressed }) => [styles.railHomePressable, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Go home and finish book"
                  >
                    <Image
                      source={cmsLocalUiAssets.homeButton}
                      style={styles.railHomeImg}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                      accessibilityLabel="Home button"
                    />
                  </Pressable>
                )}
              </View>
            ) : null}
          </View>
        </View>

        {isFinalizing ? (
          <View
            style={styles.finalizeOverlay}
            accessibilityRole="progressbar"
            accessibilityLabel={finalizingMessage}
            accessibilityLiveRegion="polite"
          >
            <View style={styles.finalizeCard}>
              <CmsPlayerLoadingSpinner size={56} accessibilityLabel={finalizingMessage} />
              <Text style={styles.finalizeTitle}>{finalizingMessage}</Text>
              <Text style={styles.finalizeSubtitle}>Please wait a moment.</Text>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    position: 'relative',
  },
  /** Horizontal: balance spacer | stage (flex) | close rail */
  playerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: ROW_GAP,
  },
  /** Invisible width balance so the 16:9 stage sits in the horizontal center. */
  sideRailSpacer: {
    width: CLOSE_RAIL,
    flexShrink: 0,
  },
  sideRail: {
    width: CLOSE_RAIL,
    flexShrink: 0,
    alignSelf: 'stretch',
    paddingTop: spacing[1],
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sideRailReward: {
    justifyContent: 'space-between',
    paddingBottom: spacing[2],
  },
  sideRailFlushTop: {
    paddingTop: 0,
  },
  railIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  railHomeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  railHomePressable: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  railHomeImg: {
    width: 40,
    height: 40,
  },
  finalizeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    zIndex: 200,
    elevation: 200,
  },
  finalizeCard: {
    width: '86%',
    maxWidth: 420,
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[5],
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing[3],
  },
  finalizeTitle: {
    fontFamily: Quicksand.bold,
    fontSize: 18,
    color: '#141414',
    textAlign: 'center',
  },
  finalizeSubtitle: {
    fontFamily: Quicksand.semiBold,
    fontSize: 14,
    color: '#414141',
    textAlign: 'center',
  },
  pressed: { opacity: 0.72 },
  stageCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 0,
    minWidth: 0,
  },
  /** Match web pageFrameSx: 16:9, border, radius */
  stageFrame: {
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    maxWidth: '100%',
  },
  stageShell: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  preloadFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  preloadCard: {
    width: '86%',
    maxWidth: 640,
    padding: spacing[6],
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  preloadTitle: {
    fontFamily: Quicksand.bold,
    fontSize: 18,
    color: '#141414',
    marginBottom: 6,
    textAlign: 'center',
  },
  preloadSubtitle: {
    fontFamily: Quicksand.semiBold,
    fontSize: 14,
    color: '#414141',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.borderSecondary,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.secondary,
  },
  preloadPct: {
    fontFamily: Quicksand.bold,
    color: '#141414',
  },
  preloadWarn: {
    marginTop: 10,
    fontFamily: Quicksand.semiBold,
    fontSize: 13,
    color: '#7a4b00',
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: Quicksand.bold,
    color: colors.text,
  },
});
