import React, { useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import retryButtonImage from '../../../assets/images/book/retry_button.png';
import contentBackButtonImage from '../../../assets/images/book/content_back_button.png';
import contentNextButtonImage from '../../../assets/images/book/content_next_button.png';
import demoPlayButtonImage from '../../../assets/images/book/demo_play_button.png';
import introPlayButtonImage from '../../../assets/images/book/intro_play_button.png';
import bigLogo from '../../../assets/images/big-logo.png';

const pageFrameSx = {
  width: 'min(100vw, calc(100vh * 16 / 9))',
  maxWidth: '100vw',
  maxHeight: '100vh',
  aspectRatio: '1920 / 1080',
  borderRadius: '8px',
  overflow: 'hidden',
  border: (theme) => `1px solid ${theme.palette.border.main}`,
  position: 'relative',
  backgroundColor: '#ffffff',
};

const imageActionButtonSx = {
  border: 'none',
  p: 0,
  m: 0,
  minWidth: 0,
  width: { xs: 116, md: 144 },
  height: { xs: 116, md: 144 },
  borderRadius: 0,
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: 'transparent',
    opacity: 0.92,
  },
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
};

const getPlayablePages = (pages = []) => pages.filter((page) => Boolean(page?.type));

const resolvePageType = (rawType = '') => {
  if (rawType === 'cover') return 'intro';
  if (rawType === 'activity_demo_video') return 'demo';
  if (rawType === 'activity_drag_2x1' || rawType === 'activity_drag_2x2') return 'interactive';
  return rawType;
};

const resolveImageUrl = (page = {}) =>
  page.imageUrl
  || page.backgroundImageUrl
  || page?.media?.imageUrl
  || page?.media?.backgroundImageUrl
  || page?.media?.image?.url
  || page?.media?.backgroundImage?.url
  || page?.media?.imageMedia?.url
  || page?.media?.backgroundImageMedia?.url
  || page?.media?.guideImageMedia?.url
  || '';

const resolveVideoUrl = (page = {}) =>
  page.videoUrl
  || page?.media?.videoUrl
  || page?.media?.video?.url
  || page?.media?.videoMedia?.url
  || '';

const resolveAudioUrl = (page = {}) =>
  page.audioUrl
  || page?.media?.audioUrl
  || page?.media?.audio?.url
  || page?.media?.audioMedia?.url
  || page?.media?.instructionAudioMedia?.url
  || '';

const CmsBooksModalTest = ({
  open,
  onClose,
  pages = [],
}) => {
  const playablePages = useMemo(() => getPlayablePages(pages), [pages]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [lastResult, setLastResult] = useState('');

  const currentPage = playablePages[currentIndex] || null;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < playablePages.length - 1;

  const goToIndex = (nextIndex) => {
    setCurrentIndex(nextIndex);
    setSelectedOptionId('');
    setLastResult('');
  };

  const goNext = () => {
    if (!hasNext) return;
    goToIndex(currentIndex + 1);
  };

  const goPrev = () => {
    if (!hasPrev) return;
    goToIndex(currentIndex - 1);
  };

  const handleClose = () => {
    setCurrentIndex(0);
    setSelectedOptionId('');
    setLastResult('');
    onClose?.();
  };

  const handleInteractivePick = (optionId) => {
    setSelectedOptionId(optionId);
    const correctOptionId = currentPage?.answerOneCorrectOptionId || currentPage?.interaction?.dropZones?.[0]?.correctOptionId;
    const isCorrect = optionId === correctOptionId;
    setLastResult(isCorrect ? 'correct' : 'wrong');
  };

  const handleRetry = () => {
    setSelectedOptionId('');
    setLastResult('');
  };

  const renderPageContent = () => {
    if (!currentPage) {
      return (
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
    }

    const pageType = resolvePageType(currentPage.type);
    const isIntro = pageType === 'intro';
    const isContent = pageType === 'content';
    const isDemo = pageType === 'demo';
    const isInteractive = pageType === 'interactive';
    const isReward = pageType === 'reward';

    const bgImage = resolveImageUrl(currentPage);
    const videoUrl = resolveVideoUrl(currentPage);
    const audioUrl = resolveAudioUrl(currentPage);

    if (isContent) {
      return (
        <Box sx={pageFrameSx}>
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              backgroundColor: '#ffffff',
              position: 'relative',
            }}
          >
            {audioUrl ? (
              <audio
                key={`${currentPage.pageId || currentPage.id || 'content'}-audio`}
                src={audioUrl}
                autoPlay
                aria-label="Content background audio"
                style={{ display: 'none' }}
              />
            ) : null}
            <Box
              sx={{
                borderRight: (theme) => `1px solid ${theme.palette.border.main}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'stretch',
                p: { xs: 2, md: 3 },
                backgroundColor: '#fff',
                position: 'relative',
              }}
            >
              <Box
                aria-label="Decorative top dots"
                sx={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: { xs: 1, md: 1.4 },
                  pt: { xs: 0.5, md: 1 },
                }}
              >
                {Array.from({ length: 14 }).map((_, dotIndex) => (
                  <Box
                    key={`test-content-dot-${dotIndex + 1}`}
                    sx={{
                      width: { xs: 10, md: 14 },
                      height: { xs: 10, md: 14 },
                      borderRadius: '50%',
                      backgroundColor: 'secondary.main',
                    }}
                  />
                ))}
              </Box>

              <Typography
                aria-label="Content subtitle"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 800,
                  fontSize: { xs: '1.7rem', md: '2.4rem' },
                  color: '#141414',
                  textAlign: 'center',
                  px: 1,
                  width: '100%',
                  maxWidth: '92%',
                  alignSelf: 'flex-end',
                  mt: 'auto',
                  mb: 'auto',
                }}
              >
                {currentPage.subtitle || 'Subtitle'}
              </Typography>

              <Box
                component="img"
                src={bigLogo}
                alt="Rise Up Kids logo"
                sx={{
                  width: { xs: '176px', md: '240px' },
                  height: 'auto',
                  objectFit: 'contain',
                  alignSelf: 'center',
                }}
              />
            </Box>

            <Box
              sx={{
                position: 'relative',
                backgroundColor: 'rgba(255, 165, 0, 0.08)',
                overflow: 'hidden',
              }}
            >
              {bgImage ? (
                <Box
                  component="img"
                  src={bgImage}
                  alt={currentPage.title || 'Content preview'}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
                  }}
                />
              ) : null}
            </Box>
          </Box>

          <IconButton
            onClick={goPrev}
            disabled={!hasPrev}
            aria-label="Go to previous page"
            sx={{
              ...imageActionButtonSx,
              position: 'absolute',
              left: { xs: 12, md: 18 },
              bottom: { xs: 44, md: 106 },
            }}
          >
            <img src={contentBackButtonImage} alt="Back button" />
          </IconButton>
          <IconButton
            onClick={goNext}
            disabled={!hasNext}
            aria-label="Go to next page"
            sx={{
              ...imageActionButtonSx,
              position: 'absolute',
              right: { xs: 12, md: 18 },
              bottom: { xs: 44, md: 106 },
            }}
          >
            <img src={contentNextButtonImage} alt="Next button" />
          </IconButton>
        </Box>
      );
    }

    return (
      <Box sx={pageFrameSx}>
        {bgImage ? (
          <Box
            component="img"
            src={bgImage}
            alt={currentPage.title || `${currentPage.type} preview`}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}

        {(videoUrl && (isDemo || isReward)) ? (
          <Box
            component="video"
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            aria-label={`${currentPage.type} video preview`}
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
            justifyContent: isInteractive ? 'space-between' : 'center',
            p: { xs: 2, md: 3 },
            background: isIntro
              ? 'transparent'
              : (isDemo || isReward || isInteractive)
                ? 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.38))'
                : 'linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.26))',
          }}
        >
          <Box sx={{ mt: 1, textAlign: 'center', color: isIntro ? 'text.primary' : 'common.white' }}>
            {currentPage.subtitle ? (
              <Typography sx={{ fontFamily: 'Quicksand, sans-serif', opacity: 0.95 }}>
                {currentPage.subtitle}
              </Typography>
            ) : null}
          </Box>

          {isInteractive ? (
            <Box
              role="group"
              aria-label="Interactive answer options"
              sx={{
                width: '100%',
                maxWidth: 760,
                mt: 'auto',
                mb: 'auto',
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              {[
                {
                  id: 'option_one',
                  label: currentPage?.interaction?.options?.[0]?.label || 'Option 1',
                  image: currentPage.optionImageOne || currentPage?.interaction?.options?.[0]?.imageUrl || currentPage?.interaction?.options?.[0]?.image?.url || currentPage?.interaction?.options?.[0]?.imageMedia?.url || '',
                },
                {
                  id: 'option_two',
                  label: currentPage?.interaction?.options?.[1]?.label || 'Option 2',
                  image: currentPage.optionImageTwo || currentPage?.interaction?.options?.[1]?.imageUrl || currentPage?.interaction?.options?.[1]?.image?.url || currentPage?.interaction?.options?.[1]?.imageMedia?.url || '',
                },
              ].map((option) => (
                <Box
                  key={option.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Choose ${option.label}`}
                  onClick={() => handleInteractivePick(option.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleInteractivePick(option.id);
                    }
                  }}
                  sx={{
                    minHeight: 180,
                    borderRadius: '12px',
                    border: '2px solid rgba(255,255,255,0.9)',
                    backgroundColor: selectedOptionId === option.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  {option.image ? (
                    <Box component="img" src={option.image} alt={option.label} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Typography sx={{ color: 'common.white', fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                      {option.label}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          ) : null}

          {isInteractive ? (
            <Box sx={{ color: 'common.white', textAlign: 'center', mt: 1.2 }}>
              {lastResult === 'correct' ? (
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 800 }}>
                  Correct! Continue to the next page.
                </Typography>
              ) : lastResult === 'wrong' ? (
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 800 }}>
                  Wrong answer. Tap retry.
                </Typography>
              ) : (
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                  Select an option to test interaction.
                </Typography>
              )}
            </Box>
          ) : null}
        </Box>

        {isIntro ? (
          <IconButton
            onClick={goNext}
            disabled={!hasNext}
            aria-label="Play intro and continue"
            sx={{
              ...imageActionButtonSx,
              position: 'absolute',
              left: '50%',
              bottom: { xs: 52, md: 66 },
              transform: 'translateX(-50%)',
            }}
          >
            <img src={introPlayButtonImage} alt="Intro play button" />
          </IconButton>
        ) : null}

        {isDemo ? (
          <IconButton
            onClick={goNext}
            disabled={!hasNext}
            aria-label="Play demo and continue to interactive"
            sx={{
              ...imageActionButtonSx,
              position: 'absolute',
              right: { xs: 12, md: 18 },
              bottom: { xs: 44, md: 56 },
            }}
          >
            <img src={demoPlayButtonImage} alt="Demo play button" />
          </IconButton>
        ) : null}

        {(isInteractive || isReward) ? (
          <IconButton
            onClick={handleRetry}
            aria-label="Retry current page"
            sx={{
              ...imageActionButtonSx,
              position: 'absolute',
              right: { xs: 12, md: 18 },
              bottom: { xs: 44, md: 56 },
            }}
          >
            <img src={retryButtonImage} alt="Retry button" />
          </IconButton>
        ) : null}
      </Box>
    );
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
      <DialogContent sx={{ p: 0, height: '100vh', backgroundColor: '#f8f8f8', overflow: 'hidden' }}>
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
