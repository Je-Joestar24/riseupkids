import React, { useMemo, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import contentBackButtonImage from '../../../../assets/images/book/content_back_button.png';
import contentNextButtonImage from '../../../../assets/images/book/content_next_button.png';
import bigLogo from '../../../../assets/images/big-logo.png';
import {
  imageActionButtonSx,
  pageFrameSx,
  resolveAudioUrl,
  resolveImageUrl,
} from './shared';

const ContentTest = ({
  page,
  hasPrev,
  hasNext,
  isPreloading,
  onPrev,
  onNext,
}) => {
  const bgImage = resolveImageUrl(page);
  const audioUrl = resolveAudioUrl(page);
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  const readingText = useMemo(
    () => String(page?.reading?.text || page?.readingText || page?.subtitle || '').trim(),
    [page]
  );

  const words = useMemo(() => {
    if (Array.isArray(page?.reading?.words) && page.reading.words.length) {
      return page.reading.words;
    }
    if (Array.isArray(page?.readingWords) && page.readingWords.length) {
      return page.readingWords;
    }
    return [];
  }, [page]);

  const activeWordIndex = useMemo(() => {
    if (!words.length) return -1;
    return words.findIndex(
      (word) =>
        Number.isFinite(Number(word?.start))
        && Number.isFinite(Number(word?.end))
        && currentTime >= Number(word.start)
        && currentTime < Number(word.end)
    );
  }, [currentTime, words]);

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
            ref={audioRef}
            key={`${page?.pageId || page?.id || 'content'}-audio`}
            src={audioUrl}
            autoPlay
            aria-label="Content background audio"
            onTimeUpdate={(event) => {
              setCurrentTime(Number(event.currentTarget?.currentTime || 0));
            }}
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

          <Box sx={{ width: '100%', maxWidth: '92%', alignSelf: 'flex-end', mt: 'auto', mb: 'auto' }}>
            <Typography
              aria-label="Content subtitle"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 800,
                fontSize: { xs: '1.7rem', md: '2.4rem' },
                color: '#141414',
                textAlign: 'center',
                px: 1,
              }}
            >
              {readingText || 'Subtitle'}
            </Typography>

            {words.length ? (
              <Box
                role="group"
                aria-label="Word-by-word highlighted reading text"
                sx={{
                  mt: 1.2,
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 0.8,
                  px: 1,
                }}
              >
                {words.map((word, index) => (
                  <Typography
                    key={`reading-word-${index + 1}-${word?.w || 'word'}`}
                    component="span"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 800,
                      fontSize: { xs: '1.05rem', md: '1.35rem' },
                      color: index === activeWordIndex ? '#ffffff' : '#141414',
                      backgroundColor: index === activeWordIndex ? 'orange.main' : 'transparent',
                      borderRadius: '10px',
                      px: 0.7,
                      py: 0.1,
                      transition: 'all 160ms ease',
                    }}
                  >
                    {word?.w || ''}
                  </Typography>
                ))}
              </Box>
            ) : null}
          </Box>

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
              alt={page?.title || 'Content preview'}
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
        onClick={onPrev}
        disabled={isPreloading || !hasPrev}
        aria-label="Go to previous page"
        sx={{
          ...imageActionButtonSx,
          position: 'absolute',
          left: '0.9375%',
          bottom: '9.8148%',
          width: '7.5%',
          aspectRatio: '1 / 1',
        }}
      >
        <img src={contentBackButtonImage} alt="Back button" />
      </IconButton>
      <IconButton
        onClick={onNext}
        disabled={isPreloading || !hasNext}
        aria-label="Go to next page"
        sx={{
          ...imageActionButtonSx,
          position: 'absolute',
          right: '0.9375%',
          bottom: '9.8148%',
          width: '7.5%',
          aspectRatio: '1 / 1',
        }}
      >
        <img src={contentNextButtonImage} alt="Next button" />
      </IconButton>
    </Box>
  );
};

export default ContentTest;
