import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import homeIcon from '../../../../assets/images/book/home.png';
import IntroTests from '../../../admin/common/cmsTest/IntroTests';
import ContentTest from '../../../admin/common/cmsTest/ContentTest';
import DemoTest from '../../../admin/common/cmsTest/DemoTest';
import InteractiveTest from '../../../admin/common/cmsTest/InteractiveTest';
import RewardTest from '../../../admin/common/cmsTest/RewardTest';
import CmsPlayerPreloadPanel from '../../../admin/common/cmsTest/CmsPlayerPreloadPanel';
import {
  pageFrameSx,
  phoneLandscapeOnly,
  resolvePageType,
} from '../../../admin/common/cmsTest/shared';
import usePlayerViewport from '../../../../hooks/usePlayerViewport';
import useCmsBookMedia from '../../../../hooks/useCmsBookMedia';
import { CmsMediaSrcProvider } from '../../../../hooks/cmsMediaSrc';
import { getCmsNextGateTimeoutMs } from '../../../../utils/cmsBookMediaPlan';
import { reachedLastPage } from '../../../../utils/cmsBookReadComplete';
import TurnPhonePrompt from './TurnPhonePrompt';

const getPlayablePages = (pages = []) => pages.filter((page) => Boolean(page?.type));

/**
 * The built-in book reader.
 *
 * Two ways to run it:
 *  - `autoLoadMedia` with the `book` (the child's way): the reader downloads the book's sound and video itself,
 *    nearest page first. It opens as soon as page 1's files are in, keeps downloading behind it, and keeps
 *    Next locked (with a small spinner on the button) until the next page's files are in. A page that takes too
 *    long (10 s, 12 s for a video page) opens anyway and plays from the internet, so a child is never stuck.
 *  - without it: the caller says when to wait (`isPreloading`) and nothing is downloaded here.
 */
const CmsBooksModalPlayer = ({
  open,
  onClose,
  pages = [],
  book = null,
  autoLoadMedia = false,
  isPreloading: isPreloadingProp = false,
  isFetchingBook = false,
  preloadProgress = 0,
  preloadSummary = null,
  onSessionComplete,
}) => {
  // A phone held upright is asked to turn: the card is laid OVER the book, which stays mounted underneath.
  const askToTurnPhone = usePlayerViewport() === 'phone-portrait';
  const playablePages = useMemo(() => getPlayablePages(pages), [pages]);
  const interactivePages = useMemo(
    () => playablePages.filter((page) => resolvePageType(page?.type) === 'interactive'),
    [playablePages]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  // The furthest page the child has been on: the book only counts as read once this is the last page.
  const [furthestIndex, setFurthestIndex] = useState(0);
  const [resolvedPageIds, setResolvedPageIds] = useState({});
  const [score, setScore] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const currentPage = playablePages[currentIndex] || null;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < playablePages.length - 1;

  // The book's own downloads (only when asked to; otherwise the caller decides when to wait).
  const media = useCmsBookMedia({
    enabled: Boolean(open && autoLoadMedia && book && playablePages.length > 0),
    book,
    pages: playablePages,
    focusPageIndex: currentIndex,
  });
  const waitingForFirstPage = media.enabled && !media.startReady;
  const isPreloading = isPreloadingProp || waitingForFirstPage;

  // Next stays locked until the next page's files are in. After the wait budget the page opens anyway and plays
  // from the internet (`streamAllowedFor` is the page the child was on when the budget ran out).
  const [streamAllowedFor, setStreamAllowedFor] = useState(-1);
  const nextReady = !media.enabled || !hasNext || streamAllowedFor === currentIndex || media.isPageReady(currentIndex + 1);
  const nextLocked = hasNext && !nextReady;
  // A correct answer (or any advance) that came while Next was locked: done as soon as the page is ready.
  const [advanceQueued, setAdvanceQueued] = useState(false);

  useEffect(() => {
    if (!media.enabled || isPreloading || !hasNext || nextReady) return undefined;
    const timer = setTimeout(
      () => setStreamAllowedFor(currentIndex),
      getCmsNextGateTimeoutMs(playablePages[currentIndex + 1])
    );
    return () => clearTimeout(timer);
  }, [media.enabled, isPreloading, hasNext, nextReady, currentIndex, playablePages]);

  useEffect(() => {
    setFurthestIndex((furthest) => Math.max(furthest, currentIndex));
  }, [currentIndex]);

  const goToIndex = (nextIndex) => {
    setAdvanceQueued(false);
    setCurrentIndex(nextIndex);
  };

  const goNext = () => {
    if (isPreloading || !hasNext) return;
    if (!nextReady) {
      setAdvanceQueued(true);
      return;
    }
    goToIndex(currentIndex + 1);
  };

  const goPrev = () => {
    if (isPreloading || !hasPrev) return;
    goToIndex(currentIndex - 1);
  };

  useEffect(() => {
    if (!advanceQueued || isPreloading || !hasNext || !nextReady) return;
    setAdvanceQueued(false);
    setCurrentIndex(currentIndex + 1);
  }, [advanceQueued, isPreloading, hasNext, nextReady, currentIndex]);

  const markPageScored = (page) => {
    const pageId = page?.pageId || page?.id;
    if (!pageId || resolvedPageIds[pageId]) return;
    setResolvedPageIds((prev) => ({ ...prev, [pageId]: true }));
    setScore((prev) => prev + 1);
  };

  const handleInteractiveRetry = () => {
    if (isPreloading) return;
    setAttemptCount((prev) => prev + 1);
  };

  const handleInteractiveCorrect = () => {
    if (isPreloading || !currentPage) return;
    setAttemptCount((prev) => prev + 1);
    markPageScored(currentPage);
    goNext();
  };

  const buildSessionPayload = () => ({
    score,
    maxScore: interactivePages.length || 0,
    attemptCount,
    totalPages: playablePages.length,
    completedInteractivePages: Object.keys(resolvedPageIds).length,
    reachedEnd: reachedLastPage(furthestIndex, playablePages.length),
  });

  const finalizeAndClose = async (trigger = 'close') => {
    if (isFinalizing) return;
    setIsFinalizing(true);
    await Promise.resolve(onSessionComplete?.({
      ...buildSessionPayload(),
      trigger,
    }));
    setCurrentIndex(0);
    setFurthestIndex(0);
    setAdvanceQueued(false);
    setStreamAllowedFor(-1);
    setResolvedPageIds({});
    setScore(0);
    setAttemptCount(0);
    setIsFinalizing(false);
    onClose?.();
  };

  const handleClose = () => {
    finalizeAndClose('close');
  };

  const renderRewardContent = () => {
    // The picture bundled with the site (like the Next and Back buttons), not one fetched from the server: a server
    // that does not serve it left only the words "Home button" on screen.
    return (
      <RewardTest
        page={currentPage}
        isPreloading={isPreloading}
        isFinalizing={isFinalizing}
        homeIconUrl={homeIcon}
        onHome={() => finalizeAndClose('home')}
      />
    );
  };

  // While the book's pages are still being fetched there is no percentage to show yet. When the reader downloads
  // the media itself, the wait is for the first page only.
  const renderPreloadingContent = () => (
    <CmsPlayerPreloadPanel
      preloadProgress={media.enabled ? media.startProgress : preloadProgress}
      preloadSummary={media.enabled ? null : preloadSummary}
      {...(isFetchingBook
        ? { title: 'Opening your book...', subtitle: 'Getting the pages ready. Please wait.', indeterminate: true }
        : media.enabled
          ? { title: 'Getting your book ready...', subtitle: 'Just the first page, then you can start.' }
          : {})}
    />
  );

  const renderEmptyState = () => (
    <Box
      sx={{
        ...pageFrameSx,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'common.white',
      }}
    >
      <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
        No pages to play yet.
      </Typography>
    </Box>
  );

  const renderPageContent = () => {
    if (isPreloading) return renderPreloadingContent();
    if (!currentPage) return renderEmptyState();

    const pageType = resolvePageType(currentPage.type);

    if (pageType === 'content') {
      return (
        <ContentTest
          key={currentPage.pageId || currentPage.id || `content-${currentIndex}`}
          page={currentPage}
          hasPrev={hasPrev}
          hasNext={hasNext}
          isPreloading={isPreloading}
          nextLocked={nextLocked}
          onPrev={goPrev}
          onNext={goNext}
        />
      );
    }

    if (pageType === 'intro') {
      return (
        <IntroTests
          page={currentPage}
          hasNext={hasNext}
          isPreloading={isPreloading}
          nextLocked={nextLocked}
          onNext={goNext}
        />
      );
    }

    if (pageType === 'demo') {
      return (
        <DemoTest
          page={currentPage}
          hasNext={hasNext}
          isPreloading={isPreloading}
          nextLocked={nextLocked}
          onNext={goNext}
        />
      );
    }

    if (pageType === 'interactive') {
      return (
        <InteractiveTest
          key={currentPage.pageId || currentPage.id || `interactive-${currentIndex}`}
          page={currentPage}
          isPreloading={isPreloading}
          onPickOption={() => {}}
          onRetry={handleInteractiveRetry}
          onCorrectDrop={handleInteractiveCorrect}
        />
      );
    }

    if (pageType === 'reward') {
      return renderRewardContent();
    }

    return renderEmptyState();
  };

  return (
    <Dialog
      open={Boolean(open)}
      onClose={handleClose}
      fullScreen
      PaperProps={{
        sx: {
          borderRadius: 0,
          backgroundColor: '#f8f8f8',
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0, height: '100dvh', backgroundColor: '#f8f8f8', overflow: 'hidden' }}>
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <IconButton
            onClick={handleClose}
            disabled={isFinalizing}
            aria-label="Close book player"
            sx={{
              position: 'absolute',
              top: { xs: 10, md: 14 },
              right: { xs: 10, md: 14 },
              zIndex: 20,
              color: '#fff',
              backgroundColor: 'orange.main',
              borderRadius: '10px',
              ...phoneLandscapeOnly({
                minWidth: 44,
                minHeight: 44,
                top: 'max(8px, env(safe-area-inset-top))',
                right: 'max(10px, env(safe-area-inset-right))',
              }),
              '&:hover': {
                backgroundColor: 'orange.dark',
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          <CmsMediaSrcProvider resolve={media.resolve}>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {renderPageContent()}
            </Box>
          </CmsMediaSrcProvider>
          {advanceQueued && nextLocked && (
            <Box
              role="status"
              sx={{
                position: 'absolute',
                left: '50%',
                bottom: 'max(12px, env(safe-area-inset-bottom))',
                transform: 'translateX(-50%)',
                zIndex: 15,
                px: 2,
                py: 0.75,
                borderRadius: '999px',
                backgroundColor: 'rgba(0,0,0,0.65)',
                color: '#fff',
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: '0.9rem',
                pointerEvents: 'none',
              }}
            >
              Getting the next page ready...
            </Box>
          )}
          {askToTurnPhone && <TurnPhonePrompt />}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CmsBooksModalPlayer;
