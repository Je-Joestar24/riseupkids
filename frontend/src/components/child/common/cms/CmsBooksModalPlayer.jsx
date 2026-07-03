import React, { useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { BACKEND_BASE_URL } from '../../../../config/constants';
import IntroTests from '../../../admin/common/cmsTest/IntroTests';
import ContentTest from '../../../admin/common/cmsTest/ContentTest';
import DemoTest from '../../../admin/common/cmsTest/DemoTest';
import InteractiveTest from '../../../admin/common/cmsTest/InteractiveTest';
import RewardTest from '../../../admin/common/cmsTest/RewardTest';
import CmsPlayerPreloadPanel from '../../../admin/common/cmsTest/CmsPlayerPreloadPanel';
import {
  pageFrameSx,
  resolvePageType,
} from '../../../admin/common/cmsTest/shared';

const getPlayablePages = (pages = []) => pages.filter((page) => Boolean(page?.type));

const CmsBooksModalPlayer = ({
  open,
  onClose,
  pages = [],
  isPreloading = false,
  preloadProgress = 0,
  preloadSummary = null,
  onSessionComplete,
}) => {
  const playablePages = useMemo(() => getPlayablePages(pages), [pages]);
  const interactivePages = useMemo(
    () => playablePages.filter((page) => resolvePageType(page?.type) === 'interactive'),
    [playablePages]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolvedPageIds, setResolvedPageIds] = useState({});
  const [score, setScore] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const currentPage = playablePages[currentIndex] || null;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < playablePages.length - 1;

  const goToIndex = (nextIndex) => {
    setCurrentIndex(nextIndex);
  };

  const goNext = () => {
    if (isPreloading || !hasNext) return;
    goToIndex(currentIndex + 1);
  };

  const goPrev = () => {
    if (isPreloading || !hasPrev) return;
    goToIndex(currentIndex - 1);
  };

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
  });

  const finalizeAndClose = async (trigger = 'close') => {
    if (isFinalizing) return;
    setIsFinalizing(true);
    await Promise.resolve(onSessionComplete?.({
      ...buildSessionPayload(),
      trigger,
    }));
    setCurrentIndex(0);
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
    const homeIconUrl = `${BACKEND_BASE_URL}/book-seeds/home.png`;

    return (
      <RewardTest
        page={currentPage}
        isPreloading={isPreloading}
        isFinalizing={isFinalizing}
        homeIconUrl={homeIconUrl}
        onHome={() => finalizeAndClose('home')}
      />
    );
  };

  const renderPreloadingContent = () => (
    <CmsPlayerPreloadPanel
      preloadProgress={preloadProgress}
      preloadSummary={preloadSummary}
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
        <IntroTests
          page={currentPage}
          hasNext={hasNext}
          isPreloading={isPreloading}
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
              '&:hover': {
                backgroundColor: 'orange.dark',
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {renderPageContent()}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CmsBooksModalPlayer;
