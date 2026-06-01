import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import IntroTests from './cmsTest/IntroTests';
import ContentTest from './cmsTest/ContentTest';
import DemoTest from './cmsTest/DemoTest';
import InteractiveTest from './cmsTest/InteractiveTest';
import RewardTest from './cmsTest/RewardTest';
import { pageFrameSx, resolvePageType } from './cmsTest/shared';

const getPlayablePages = (pages = []) => pages.filter((page) => Boolean(page?.type));

const CmsBooksModalTest = ({
  open,
  onClose,
  pages = [],
  isPreloading = false,
  preloadProgress = 0,
  preloadSummary = null,
}) => {
  const playablePages = useMemo(() => getPlayablePages(pages), [pages]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setCurrentIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [playablePages]);

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

  const handleClose = () => {
    setCurrentIndex(0);
    onClose?.();
  };

  const handleInteractivePick = (_optionId) => {
    if (isPreloading) return;
  };

  const handleRetry = () => {
    if (isPreloading) return;
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
        No pages to test yet.
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
          onPickOption={handleInteractivePick}
          onRetry={handleRetry}
          onCorrectDrop={goNext}
        />
      );
    }

    if (pageType === 'reward') {
      return (
        <RewardTest
          page={currentPage}
          isPreloading={isPreloading}
          onRetry={handleRetry}
        />
      );
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
            aria-label="Close book tester"
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

export default CmsBooksModalTest;
