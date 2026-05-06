import React, { useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { BACKEND_BASE_URL } from '../../../../config/constants';
import IntroTests from '../../../admin/common/cmsTest/IntroTests';
import ContentTest from '../../../admin/common/cmsTest/ContentTest';
import DemoTest from '../../../admin/common/cmsTest/DemoTest';
import InteractiveTest from '../../../admin/common/cmsTest/InteractiveTest';
import {
  imageActionButtonSx,
  pageFrameSx,
  resolveImageUrl,
  resolvePageType,
  resolveVideoUrl,
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
    const bgImage = resolveImageUrl(currentPage);
    const videoUrl = resolveVideoUrl(currentPage);
    const homeIconUrl = `${BACKEND_BASE_URL}/book-seeds/home.png`;

    return (
      <Box sx={pageFrameSx}>
        {bgImage ? (
          <Box
            component="img"
            src={bgImage}
            alt={currentPage?.title || 'Reward preview'}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}

        {videoUrl ? (
          <Box
            component="video"
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            aria-label="Reward video preview"
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 2, md: 3 },
            background: 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.38))',
          }}
        >
          <Box sx={{ mt: 1, textAlign: 'center', color: 'common.white' }}>
            {currentPage?.subtitle ? (
              <Typography sx={{ fontFamily: 'Quicksand, sans-serif', opacity: 0.95 }}>
                {currentPage.subtitle}
              </Typography>
            ) : null}
          </Box>
        </Box>

        <IconButton
          onClick={() => finalizeAndClose('home')}
          disabled={isPreloading || isFinalizing}
          aria-label="Go home and finish book"
          sx={{
            ...imageActionButtonSx,
            position: 'absolute',
            right: '0.9375%',
            bottom: '5.1852%',
            width: '7.5%',
            aspectRatio: '1 / 1',
            zIndex: 30,
          }}
        >
          <img src={homeIconUrl} alt="Home button" />
        </IconButton>
      </Box>
    );
  };

  const renderPreloadingContent = () => (
    <Box
      sx={{
        ...pageFrameSx,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #fffaf2 0%, #fff3e6 100%)',
      }}
    >
      <Box
        role="status"
        aria-label="Loading all media assets for smooth playback"
        sx={{
          width: 'min(86%, 640px)',
          p: { xs: 3, md: 4 },
          borderRadius: '16px',
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: (theme) => `1px solid ${theme.palette.border.main}`,
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 800, color: '#141414', mb: 1 }}>
          Loading all content...
        </Typography>
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, color: '#414141', mb: 2 }}>
          Preparing media for smooth playback. Please wait.
        </Typography>
        <LinearProgress
          variant="determinate"
          value={Math.max(0, Math.min(100, Number(preloadProgress) || 0))}
          aria-label="Media preload progress"
          sx={{ height: 10, borderRadius: '999px', mb: 1.4 }}
        />
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, color: '#141414' }}>
          {Math.max(0, Math.min(100, Number(preloadProgress) || 0))}% loaded
        </Typography>
        {preloadSummary?.failed?.length ? (
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '0.84rem', color: '#7a4b00', mt: 1 }}>
            Some files could not be preloaded, but playback will still continue.
          </Typography>
        ) : null}
      </Box>
    </Box>
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
