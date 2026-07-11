import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import contentBackButtonImage from '../../../../assets/images/book/content_back_button.png';
import contentNextButtonImage from '../../../../assets/images/book/content_next_button.png';
import bigLogo from '../../../../assets/images/big-logo.png';
import { useMediaLoadRecovery } from '../../../../utils/cmsMediaPlayback';
import {
  imageActionButtonSx,
  pageFrameSx,
  resolveAudioUrl,
  resolveContentReadingFontSizePx,
  resolveImageUrl,
} from './shared';
import { buildWeightedWords } from '../../booksbuildercreate/BooksBuilderCreate.utils';
import {
  CMS_READING_LINE_ERASE_MS,
  getActiveReadingLineIndex,
  getActiveReadingWordIndexInLine,
  getUpcomingReadingLineIndex,
  groupReadingWordsByLine,
  normalizeReadingText,
} from './readingLines';

const isValidTimedWord = (word) => {
  const start = Number(word?.start);
  const end = Number(word?.end);
  return Boolean(
    String(word?.w || '').trim()
    && Number.isFinite(start)
    && Number.isFinite(end)
    && end > start
  );
};

const resolveReadingDurationSec = (page = {}) => {
  const fromReading = Number(page?.reading?.durationSec);
  if (Number.isFinite(fromReading) && fromReading > 0) return fromReading;
  const fromPage = Number(page?.audioDurationSec);
  if (Number.isFinite(fromPage) && fromPage > 0) return fromPage;
  return null;
};

const resolveTimedReadingWords = (page = {}, readingText = '') => {
  const rawWords = Array.isArray(page?.reading?.words) && page.reading.words.length
    ? page.reading.words
    : (Array.isArray(page?.readingWords) ? page.readingWords : []);
  const validWords = rawWords.filter(isValidTimedWord);
  if (validWords.length) return validWords;

  const durationSec = resolveReadingDurationSec(page);
  if (readingText && durationSec) {
    return buildWeightedWords(readingText, durationSec);
  }
  return [];
};

function useReadingLineTransition(activeLineIndex, resetKey) {
  const [displayLineIndex, setDisplayLineIndex] = useState(-1);
  const [visible, setVisible] = useState(false);
  const previousLineRef = useRef(activeLineIndex);

  useEffect(() => {
    setDisplayLineIndex(-1);
    setVisible(false);
    previousLineRef.current = -1;
  }, [resetKey]);

  useEffect(() => {
    const previousLine = previousLineRef.current;
    if (activeLineIndex === previousLine) return undefined;

    if (activeLineIndex < 0) {
      setVisible(false);
      const timer = window.setTimeout(() => {
        setDisplayLineIndex(-1);
        previousLineRef.current = activeLineIndex;
      }, CMS_READING_LINE_ERASE_MS);
      return () => window.clearTimeout(timer);
    }

    if (previousLine >= 0 && previousLine !== activeLineIndex) {
      setVisible(false);
      const timer = window.setTimeout(() => {
        setDisplayLineIndex(activeLineIndex);
        setVisible(true);
        previousLineRef.current = activeLineIndex;
      }, CMS_READING_LINE_ERASE_MS);
      return () => window.clearTimeout(timer);
    }

    setDisplayLineIndex(activeLineIndex);
    setVisible(true);
    previousLineRef.current = activeLineIndex;
    return undefined;
  }, [activeLineIndex]);

  return { displayLineIndex, visible };
}

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
  const { src: audioSrc, onMediaError: onAudioError } = useMediaLoadRecovery(audioUrl);
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const pageKey = page?.pageId || page?.id || 'content';

  const readingText = useMemo(
    () => normalizeReadingText(page?.reading?.text || page?.readingText || page?.subtitle || ''),
    [page?.reading?.text, page?.readingText, page?.subtitle]
  );

  const words = useMemo(
    () => resolveTimedReadingWords(page, readingText),
    [page, readingText]
  );

  const lineGroups = useMemo(
    () => groupReadingWordsByLine(words, readingText),
    [words, readingText]
  );

  const hasTimedWords = lineGroups.length > 0;

  useEffect(() => {
    setCurrentTime(0);
  }, [pageKey, audioSrc]);

  const activeLineIndex = useMemo(
    () => getActiveReadingLineIndex(currentTime, lineGroups),
    [currentTime, lineGroups]
  );

  const transitionLineIndex = useMemo(() => {
    if (!hasTimedWords) return -1;
    if (activeLineIndex >= 0) return activeLineIndex;

    const upcomingIndex = getUpcomingReadingLineIndex(currentTime, lineGroups);
    if (upcomingIndex >= 0) return upcomingIndex;

    const firstStart = Number(lineGroups[0]?.words?.[0]?.start);
    if (Number.isFinite(firstStart) && currentTime <= firstStart + 0.05) {
      return 0;
    }

    return -1;
  }, [activeLineIndex, currentTime, hasTimedWords, lineGroups]);

  const { displayLineIndex, visible } = useReadingLineTransition(
    transitionLineIndex,
    pageKey
  );

  const visibleLineWords = useMemo(() => {
    if (displayLineIndex < 0) return [];
    return lineGroups[displayLineIndex]?.words || [];
  }, [displayLineIndex, lineGroups]);

  const activeWordIndex = useMemo(() => {
    if (!visible || displayLineIndex !== activeLineIndex) return -1;
    return getActiveReadingWordIndexInLine(currentTime, visibleLineWords);
  }, [visible, displayLineIndex, activeLineIndex, currentTime, visibleLineWords]);

  const showStaticReadingText = !hasTimedWords && Boolean(readingText);
  const textVisible = showStaticReadingText || visible;

  const readingFontSizePx = useMemo(() => resolveContentReadingFontSizePx(page), [page]);
  const readingFontSx = useMemo(
    () =>
      readingFontSizePx != null
        ? {
            fontSize: `${readingFontSizePx}px`,
          }
        : {
            fontSize: { xs: '1.7rem', md: '2.4rem' },
          },
    [readingFontSizePx]
  );

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
        {audioSrc ? (
          <audio
            ref={audioRef}
            key={`${pageKey}-audio-${audioSrc}`}
            src={audioSrc}
            autoPlay
            preload="metadata"
            aria-label="Content background audio"
            onLoadedMetadata={(event) => {
              setCurrentTime(Number(event.currentTarget?.currentTime || 0));
            }}
            onTimeUpdate={(event) => {
              setCurrentTime(Number(event.currentTarget?.currentTime || 0));
            }}
            onError={onAudioError}
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
              component="div"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 800,
                ...readingFontSx,
                color: '#141414',
                textAlign: 'center',
                px: 1,
                minHeight: '3.2em',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 0.8,
                opacity: textVisible ? 1 : 0,
                transition: showStaticReadingText ? 'none' : `opacity ${CMS_READING_LINE_ERASE_MS}ms ease`,
              }}
            >
              {visibleLineWords.length
                ? visibleLineWords.map((word, index) => (
                  <Typography
                    key={`inline-reading-word-${displayLineIndex}-${index + 1}-${word?.w || 'word'}`}
                    component="span"
                    sx={{
                      fontFamily: 'inherit',
                      fontWeight: 'inherit',
                      fontSize: 'inherit',
                      color: index === activeWordIndex ? 'accent.main' : '#141414',
                      px: 0.2,
                      transition: 'color 160ms ease',
                    }}
                  >
                    {word?.w || ''}
                  </Typography>
                ))
                : !words.length && (readingText || 'Subtitle')}
            </Typography>
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
