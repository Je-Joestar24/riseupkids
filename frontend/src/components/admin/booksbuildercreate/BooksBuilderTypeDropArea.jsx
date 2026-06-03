import React, { useMemo, useRef, useState } from 'react';
import { Box, IconButton, MenuItem, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AddCircleOutline, PlayArrow, Stop } from '@mui/icons-material';
import { PAGE_TYPES } from './BooksBuilderCreate.constants';
import useAudioFileWithSilenceTrim from '../../../hooks/useAudioFileWithSilenceTrim';
import {
  CONTENT_READING_FONT_SIZE_PRESETS,
  resolveContentReadingFontSizePx,
} from '../../../utils/cmsContentReading';
import { buildWeightedWords, getOppositeInteractiveOption } from './BooksBuilderCreate.utils';
import bigLogo from '../../../assets/images/big-logo.png';

const interactiveSelectProps = {
  MenuProps: {
    disableScrollLock: true,
    keepMounted: false,
  },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const MIN_WORD_DURATION_SEC = 0.05;

const BooksBuilderTypeDropArea = ({ page, pageIndex, onOpenTypeMenu, onPatch }) => {
  const theme = useTheme();
  const { isTrimming: isOptionAudioTrimming, processAudioFile } = useAudioFileWithSilenceTrim();
  const introImageInputRef = useRef(null);
  const contentImageInputRef = useRef(null);
  const demoVideoInputRef = useRef(null);
  const interactiveBackgroundInputRef = useRef(null);
  const optionAudioInputOneRef = useRef(null);
  const optionAudioInputTwoRef = useRef(null);
  const selectedLabel = PAGE_TYPES.find((item) => item.key === page.type)?.label || null;
  const isIntroPage = page.type === 'intro';
  const isDemoPage = page.type === 'demo';
  const isRewardPage = page.type === 'reward';
  const isVideoUploadPage = isDemoPage || isRewardPage;
  const isContentPage = page.type === 'content';
  const isInteractivePage = page.type === 'interactive';
  const isParallelInteractive = page.interactionMode === 'two_options_two_answers';
  const hasIntroImage = Boolean(page.imageUrl);
  const hasContentImage = Boolean(page.imageUrl);
  const hasUploadedVideo = Boolean(page.videoUrl);
  const hasInteractiveBackground = Boolean(page.backgroundImageUrl);
  const hasPrimaryMedia = hasIntroImage || (isVideoUploadPage && hasUploadedVideo);
  const contentAudioRef = useRef(null);
  const contentTimelineTrackRef = useRef(null);
  const [contentCurrentTime, setContentCurrentTime] = useState(0);
  const [isContentPlaying, setIsContentPlaying] = useState(false);
  const [timelineDragIndex, setTimelineDragIndex] = useState(-1);

  const contentReadingText = useMemo(
    () => String(page.readingText || page.subtitle || '').trim(),
    [page.readingText, page.subtitle]
  );

  const contentTimingWords = useMemo(() => {
    if (Array.isArray(page.readingWords) && page.readingWords.length) return page.readingWords;
    if (Array.isArray(page.reading?.words) && page.reading.words.length) return page.reading.words;
    const duration = Number(page.audioDurationSec);
    if (contentReadingText && Number.isFinite(duration) && duration > 0) {
      return buildWeightedWords(contentReadingText, duration);
    }
    return [];
  }, [contentReadingText, page.audioDurationSec, page.reading?.words, page.readingWords]);

  const activeContentWordIndex = useMemo(() => {
    if (!contentTimingWords.length) return -1;
    return contentTimingWords.findIndex(
      (word) =>
        Number.isFinite(Number(word?.start))
        && Number.isFinite(Number(word?.end))
        && contentCurrentTime >= Number(word.start)
        && contentCurrentTime < Number(word.end)
    );
  }, [contentCurrentTime, contentTimingWords]);

  const contentReadingFontSizePx = useMemo(() => resolveContentReadingFontSizePx(page), [page]);
  const contentReadingFontSx = useMemo(
    () =>
      contentReadingFontSizePx != null
        ? { fontSize: `${contentReadingFontSizePx}px` }
        : { fontSize: { xs: '1.15rem', md: '1.4rem' } },
    [contentReadingFontSizePx]
  );

  const contentDurationSec = useMemo(() => {
    const explicit = Number(page.audioDurationSec);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const fallbackEnd = contentTimingWords.length
      ? Number(contentTimingWords[contentTimingWords.length - 1]?.end)
      : 0;
    return Number.isFinite(fallbackEnd) && fallbackEnd > 0 ? fallbackEnd : 0;
  }, [contentTimingWords, page.audioDurationSec]);

  const formatTimelineTime = (value) => {
    const safe = Number(value);
    if (!Number.isFinite(safe) || safe < 0) return '0.00s';
    return `${safe.toFixed(2)}s`;
  };

  const updateTimelineBoundary = (boundaryIndex, clientX) => {
    if (!contentTimingWords.length || !contentDurationSec) return;
    if (boundaryIndex <= 0 || boundaryIndex >= contentTimingWords.length) return;

    const track = contentTimelineTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (!rect.width) return;

    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const nextBoundary = ratio * contentDurationSec;
    const previousWord = contentTimingWords[boundaryIndex - 1];
    const nextWord = contentTimingWords[boundaryIndex];

    const minBoundary = Number(previousWord.start) + MIN_WORD_DURATION_SEC;
    const maxBoundary = Number(nextWord.end) - MIN_WORD_DURATION_SEC;
    const safeBoundary = clamp(nextBoundary, minBoundary, maxBoundary);

    const nextWords = contentTimingWords.map((word, index) => {
      if (index === boundaryIndex - 1) {
        return {
          ...word,
          end: Number(safeBoundary.toFixed(3)),
        };
      }
      if (index === boundaryIndex) {
        return {
          ...word,
          start: Number(safeBoundary.toFixed(3)),
        };
      }
      return word;
    });

    onPatch({ readingWords: nextWords });
  };

  const startTimelineDrag = (boundaryIndex, startEvent) => {
    startEvent.preventDefault();
    setTimelineDragIndex(boundaryIndex);

    if (Number.isFinite(startEvent?.clientX)) {
      updateTimelineBoundary(boundaryIndex, startEvent.clientX);
    }
    document.body.style.cursor = 'ew-resize';

    const handlePointerMove = (moveEvent) => {
      updateTimelineBoundary(boundaryIndex, moveEvent.clientX);
    };

    const handlePointerUp = () => {
      setTimelineDragIndex(-1);
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleIntroImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onPatch({ imageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleDropAreaAction = (targetEl) => {
    if (isIntroPage) {
      introImageInputRef.current?.click();
      return;
    }
    if (isVideoUploadPage) {
      demoVideoInputRef.current?.click();
      return;
    }
    if (isInteractivePage) return;
    onOpenTypeMenu(targetEl);
  };

  const handleContentImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onPatch({ imageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleDemoVideoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onPatch({ videoUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleInteractiveBackgroundUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onPatch({ backgroundImageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const toggleContentSamplePlayback = async () => {
    if (!isContentPage || !page.audioUrl) return;
    const audio = contentAudioRef.current;
    if (!audio) return;

    if (!isContentPlaying) {
      try {
        await audio.play();
        setIsContentPlaying(true);
      } catch (_error) {
        setIsContentPlaying(false);
      }
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    setContentCurrentTime(0);
    setIsContentPlaying(false);
  };

  const buildInteractiveUploadHandler = (fieldKey) => async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const trimmed = await processAudioFile(file);
    if (!trimmed?.audioUrl) return;
    onPatch({ [fieldKey]: trimmed.audioUrl });
  };

  const interactiveOptionChoices = [
    { value: 'option_one', label: 'Option 1' },
    { value: 'option_two', label: 'Option 2' },
  ];

  const optionAddAudioLinkSx = {
    color: 'orange.dark',
    fontFamily: 'Quicksand, sans-serif',
    fontWeight: 700,
    fontSize: { xs: '0.72rem', md: '0.82rem' },
    textDecoration: 'underline',
    cursor: 'pointer',
    display: 'inline-block',
    alignSelf: 'center',
  };

  const renderOptionAudioLink = (fieldKey) => {
    const value = page[fieldKey];
    const hasValue = Boolean(value);
    const inputId = `option-audio-link-${fieldKey}-${page.id}`;
    const inputRef = fieldKey === 'optionAudioOne' ? optionAudioInputOneRef : optionAudioInputTwoRef;
    const optionNum = fieldKey === 'optionAudioOne' ? '1' : '2';
    return (
      <Box
        sx={{
          minWidth: 200,
          maxWidth: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 0.5,
        }}
      >{/* 
        <Typography
          variant="caption"
          component="p"
          sx={{ m: 0, width: '100%', fontFamily: 'Quicksand, sans-serif', fontWeight: 700, color: 'text.secondary' }}
        >
          {`Option ${optionNum} audio`}
        </Typography> */}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          aria-label={`${hasValue ? 'Change' : 'Add'} option ${optionNum} audio`}
          onChange={buildInteractiveUploadHandler(fieldKey)}
        />
        <Typography
          role="button"
          tabIndex={0}
          component="span"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          aria-label={hasValue ? 'Change option audio' : 'Add option audio'}
          sx={optionAddAudioLinkSx}
        >
          {hasValue ? 'Change option audio' : 'Add option audio'}
        </Typography>
        {hasValue ? (
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <audio
              controls
              src={value}
              style={{ width: '100%' }}
              aria-label={`Option ${optionNum} audio preview`}
            />
          </Box>
        ) : null}
      </Box>
    );
  };

  const renderInteractiveUploadCard = ({
    fieldKey,
    label,
    accept,
    previewType,
    emptyText,
    loadedText,
    isAnswerImage = false,
    isOptionIcon = false,
  }) => {
    const value = page[fieldKey];
    const hasValue = Boolean(value);
    const inputId = `${fieldKey}-interactive-upload-${page.id}`;

    const cardBackground = hasInteractiveBackground ? 'rgba(255, 255, 255, 0.96)' : theme.palette.common.white;
    const showCompactInDrop =
      (isAnswerImage || isOptionIcon) && hasValue && previewType === 'image' && value;
    const useMinWidth200 = isAnswerImage || isOptionIcon;
    const dashedSize = (() => {
      if (isOptionIcon) {
        if (showCompactInDrop) {
          return { minHeight: '100px', maxHeight: '100px' };
        }
        return { minHeight: '72px', maxHeight: '100px' };
      }
      if (isAnswerImage) {
        if (showCompactInDrop) {
          return { minHeight: '100px', maxHeight: '100px' };
        }
        return { minHeight: '72px', maxHeight: 'none' };
      }
      if (showCompactInDrop) {
        return { minHeight: '100px', maxHeight: '100px' };
      }
      return { minHeight: '72px', maxHeight: 'none' };
    })();

    return (
      <Box
        sx={{
          border: isOptionIcon ? 'none' : `1px solid ${theme.palette.border.main}`,
          borderRadius: isOptionIcon ? 0 : '12px',
          p: isOptionIcon ? 0 : 1.25,
          minWidth: useMinWidth200 && !isOptionIcon ? 200 : 'auto',
          maxWidth: '100%',
          width: '100%',
          alignSelf: isOptionIcon ? 'center' : 'stretch',
          mx: isOptionIcon ? 'auto' : 0,
          backgroundColor: isOptionIcon ? 'transparent' : cardBackground,
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOptionIcon ? 'center' : 'stretch',
          textAlign: isOptionIcon ? 'center' : 'left',
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{ width: isOptionIcon ? '100%' : 'auto', fontFamily: 'Quicksand, sans-serif', fontWeight: 700, color: 'text.secondary' }}
        >
          {label}
        </Typography>
        <input
          id={inputId}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={buildInteractiveUploadHandler(fieldKey)}
        />
        <label
          htmlFor={inputId}
          style={{
            cursor: 'pointer',
            width: isOptionIcon ? 'auto' : '100%',
            maxWidth: '100%',
            display: 'block',
            marginLeft: isOptionIcon ? 'auto' : undefined,
            marginRight: isOptionIcon ? 'auto' : undefined,
          }}
        >
          <Box
            role="button"
            tabIndex={0}
            aria-label={showCompactInDrop ? `${label}. ${loadedText}. Click to change image` : `Upload ${label}`}
            sx={{
              border: `2px dashed ${theme.palette.orange.main}`,
              borderRadius: '10px',
              minHeight: dashedSize.minHeight,
              maxHeight: dashedSize.maxHeight,
              width: isOptionIcon ? 'auto' : '100%',
              maxWidth: '100%',
              minWidth: isOptionIcon ? '0' : undefined,
              px: 1.5,
              py: 1,
              display: 'flex',
              flexDirection: isOptionIcon ? 'column' : 'row',
              alignItems: isOptionIcon ? 'center' : 'center',
              justifyContent: 'center',
              mx: isOptionIcon ? 'auto' : 0,
              backgroundColor: `${theme.palette.orange.main}10`,
              textAlign: 'center',
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              boxSizing: 'border-box',
            }}
          >
            {showCompactInDrop ? (
              <Box
                component="img"
                src={value}
                alt={label}
                sx={{
                  display: 'block',
                  maxHeight: '100px',
                  maxWidth: '100%',
                  width: 'auto',
                  height: '100px',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  borderRadius: '8px',
                }}
              />
            ) : hasValue ? (
              <Typography
                component="span"
                sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}
              >
                {loadedText}
              </Typography>
            ) : (
              <Typography
                component="span"
                sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}
              >
                {emptyText}
              </Typography>
            )}
          </Box>
        </label>
        {hasValue ? (
          previewType === 'audio' ? (
            <audio controls src={value} style={{ width: '100%' }} />
          ) : isAnswerImage && previewType === 'image' ? null : isOptionIcon && previewType === 'image' ? null : (
            <Box
              component="img"
              src={value}
              alt={label}
              sx={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
            />
          )
        ) : null}
      </Box>
    );
  };

  if (isContentPage) {
    return (
      <Box
        sx={{
          width: '100%',
          aspectRatio: '1920 / 1080',
          borderRadius: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          border: `1px solid ${theme.palette.border.main}`,
          backgroundColor: theme.palette.common.white,
          position: 'relative',
        }}
      >
        <Typography
          role="button"
          tabIndex={0}
          aria-label={`Change page type for page ${pageIndex + 1}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpenTypeMenu(event.currentTarget);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              onOpenTypeMenu(event.currentTarget);
            }
          }}
          sx={{
            position: 'absolute',
            top: 12,
            right: 14,
            zIndex: 3,
            color: 'orange.dark',
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: { xs: '0.72rem', md: '0.82rem' },
            textDecoration: 'underline',
            cursor: 'pointer',
            px: 0.5,
          }}
        >
          Change page type
        </Typography>

        <Box
          sx={{
            borderRight: `1px solid ${theme.palette.border.main}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: { xs: 2, md: 3 },
            backgroundColor: '#fff',
            gap: 1.2
          }}
        >
          {page.audioUrl ? (
            <audio
              ref={contentAudioRef}
              src={page.audioUrl}
              preload="metadata"
              onTimeUpdate={(event) => {
                setContentCurrentTime(Number(event.currentTarget?.currentTime || 0));
              }}
              onEnded={() => {
                setIsContentPlaying(false);
                setContentCurrentTime(0);
              }}
              onPause={() => {
                if (contentAudioRef.current?.currentTime === 0) {
                  setIsContentPlaying(false);
                }
              }}
              style={{ display: 'none' }}
              aria-label="Content sample audio"
            />
          ) : null}

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
                key={`content-dot-${dotIndex + 1}`}
                sx={{
                  width: { xs: 10, md: 14 },
                  height: { xs: 10, md: 14 },
                  borderRadius: '50%',
                  backgroundColor: theme.palette.secondary.main,
                }}
              />
            ))}
          </Box>

          <Box
            sx={{
              width: '100%',
              maxWidth: '92%',
              borderRadius: '14px',
              backgroundColor: 'rgba(255,255,255,0.92)',
              px: 1.2,
              py: 1,
              mt: 'auto'
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 800,
                color: 'text.secondary',
                fontSize: { xs: '0.78rem', md: '0.86rem' },
                letterSpacing: '0.01em',
                mb: 0.9,
              }}
            >
              Transcript text editor (live playback coloring)
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 4fr) minmax(0, 1fr)' },
                gap: { xs: 1, sm: 1.1 },
                alignItems: 'start',
                width: '100%',
              }}
            >
            <Box
              sx={{
                position: 'relative',
                minHeight: { xs: 108, md: 124 },
                borderRadius: '12px',
                border: `1px solid ${theme.palette.border.main}`,
                backgroundColor: '#fff',
                px: 1.2,
                py: 1,
                overflow: 'hidden',
                minWidth: 0,
              }}
            >
              <Box
                aria-hidden
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  ...contentReadingFontSx,
                  lineHeight: 1.45,
                  textAlign: 'center',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  pointerEvents: 'none',
                  minHeight: { xs: 92, md: 108 },
                }}
              >
                {contentTimingWords.length
                  ? contentTimingWords.map((word, index) => (
                    <Box
                      key={`editor-overlay-word-${index + 1}-${word?.w || 'word'}`}
                      component="span"
                      sx={{
                        color: index === activeContentWordIndex ? 'accent.main' : '#141414',
                        transition: 'color 150ms ease',
                      }}
                    >
                      {`${word?.w || ''} `}
                    </Box>
                  ))
                  : (contentReadingText || 'Type transcript text...')}
              </Box>

              <TextField
                multiline
                minRows={3}
                maxRows={4}
                value={page.subtitle || ''}
                placeholder="Type transcript text..."
                onChange={(event) => onPatch({ subtitle: event.target.value })}
                onClick={(event) => event.stopPropagation()}
                aria-label="Edit content transcript text"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  '& .MuiOutlinedInput-root': {
                    height: '100%',
                    alignItems: 'stretch',
                    p: 0,
                    '& fieldset': {
                      border: 'none',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    ...contentReadingFontSx,
                    lineHeight: 1.45,
                    textAlign: 'center',
                    color: 'transparent',
                    caretColor: theme.palette.accent.main,
                    px: 1.2,
                    py: 1,
                    minHeight: { xs: 92, md: 108 },
                    boxSizing: 'border-box',
                    textShadow: '0 0 0 rgba(0,0,0,0)',
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: 'transparent',
                  },
                }}
              />
            </Box>

            <TextField
              select
              label="Font size"
              size="small"
              fullWidth
              value={
                page.readingFontSizePx == null || page.readingFontSizePx === ''
                  ? ''
                  : String(page.readingFontSizePx)
              }
              onChange={(event) => {
                const next = event.target.value;
                onPatch({
                  readingFontSizePx: next === '' ? null : Number(next),
                });
              }}
              onClick={(event) => event.stopPropagation()}
              aria-label="Content reading font size on canvas"
              sx={{
                minWidth: 0,
                '& .MuiInputLabel-root': {
                  fontSize: '0.72rem',
                },
                '& .MuiSelect-select': {
                  fontSize: '0.72rem',
                  py: 0.85,
                },
              }}
            >
              {CONTENT_READING_FONT_SIZE_PRESETS.map((preset) => (
                <MenuItem key={`canvas-font-${preset.value || 'default'}`} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
            </TextField>
            </Box>
          </Box>

          {contentTimingWords.length > 0 && contentDurationSec > 0 ? (
            <Box
              sx={{
                width: '100%',
                px: 1.2,
                mt: 0.4,
                mb: 0.8,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 800,
                  color: 'text.secondary',
                  fontSize: { xs: '0.76rem', md: '0.84rem' },
                  letterSpacing: '0.01em',
                  mb: 0.7,
                }}
              >
                Transcript timeline (drag dividers to retime words)
              </Typography>
              <Box
                ref={contentTimelineTrackRef}
                role="group"
                aria-label="Transcript timeline editor"
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: 58,
                  borderRadius: '10px',
                  border: `1px solid ${theme.palette.border.main}`,
                  backgroundColor: '#fff',
                  overflow: 'visible',
                  display: 'flex',
                  alignItems: 'stretch',
                }}
              >
                {contentTimingWords.map((word, index) => {
                  const safeStart = Number(word?.start);
                  const safeEnd = Number(word?.end);
                  const segmentDuration = Math.max(safeEnd - safeStart, MIN_WORD_DURATION_SEC);
                  const widthPercent = (segmentDuration / contentDurationSec) * 100;
                  const isActive = index === activeContentWordIndex;
                  return (
                    <Box
                      key={`timeline-segment-${index + 1}-${word?.w || 'word'}`}
                      sx={{
                        width: `${widthPercent}%`,
                        minWidth: '20px',
                        height: '100%',
                        position: 'relative',
                        borderRight:
                          index < contentTimingWords.length - 1
                            ? `1px solid ${theme.palette.border.main}`
                            : 'none',
                        backgroundColor: isActive ? `${theme.palette.accent.main}1A` : 'transparent',
                        transition: 'background-color 150ms ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        px: 0.35,
                        textAlign: 'center',
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 800,
                          fontSize: { xs: '0.72rem', md: '0.8rem' },
                          color: isActive ? 'accent.main' : 'text.primary',
                          lineHeight: 1.2,
                        }}
                      >
                        {word?.w || ''}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 700,
                          fontSize: { xs: '0.62rem', md: '0.7rem' },
                          color: 'text.secondary',
                          lineHeight: 1.2,
                          mt: 0.2,
                        }}
                      >
                        {`${formatTimelineTime(safeStart)}-${formatTimelineTime(safeEnd)}`}
                      </Typography>

                      {index < contentTimingWords.length - 1 ? (
                        <Box
                          role="slider"
                          aria-label={`Adjust divider between word ${index + 1} and word ${index + 2}`}
                          tabIndex={0}
                          onPointerDown={(event) => startTimelineDrag(index + 1, event)}
                          onMouseDown={(event) => startTimelineDrag(index + 1, event)}
                          onTouchStart={(event) => {
                            const touch = event.touches?.[0];
                            if (!touch) return;
                            startTimelineDrag(index + 1, { ...event, clientX: touch.clientX, preventDefault: () => event.preventDefault() });
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                            event.preventDefault();
                            const step = event.key === 'ArrowLeft' ? -0.05 : 0.05;
                            const currentBoundary = Number(contentTimingWords[index]?.end || 0);
                            const track = contentTimelineTrackRef.current;
                            if (!track || !track.getBoundingClientRect().width) return;
                            const targetBoundary = clamp(currentBoundary + step, 0, contentDurationSec);
                            const rect = track.getBoundingClientRect();
                            const fakeClientX = rect.left + (targetBoundary / contentDurationSec) * rect.width;
                            updateTimelineBoundary(index + 1, fakeClientX);
                          }}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            transform: 'translateX(50%)',
                            width: 14,
                            height: '100%',
                            cursor: 'ew-resize',
                            zIndex: 2,
                            touchAction: 'none',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 6,
                              bottom: 6,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: 3,
                              borderRadius: '999px',
                              backgroundColor:
                                timelineDragIndex === index + 1
                                  ? theme.palette.accent.main
                                  : `${theme.palette.border.secondary}`,
                            },
                          }}
                        />
                      ) : null}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ) : null}

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 'auto' }}>
            <IconButton
              onClick={toggleContentSamplePlayback}
              disabled={!page.audioUrl}
              aria-label={isContentPlaying ? 'Stop content sample playback' : 'Play content transcript sample'}
              sx={{
                borderRadius: '999px',
                px: 2,
                py: 0.75,
                backgroundColor: page.audioUrl ? theme.palette.accent.main : 'rgba(0,0,0,0.12)',
                color: '#fff',
                '&:hover': {
                  backgroundColor: page.audioUrl ? theme.palette.accent.dark : 'rgba(0,0,0,0.18)',
                },
              }}
            >
              {isContentPlaying ? <Stop /> : <PlayArrow />}
            </IconButton>
          </Box>

          <Box
            component="img"
            src={bigLogo}
            alt="Rise Up Kids logo"
            sx={{
              width: { xs: '176px', md: '240px' },
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </Box>

        <Box
          role="button"
          tabIndex={0}
          aria-label={`Upload content image for page ${pageIndex + 1}`}
          onClick={(event) => {
            event.stopPropagation();
            contentImageInputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              contentImageInputRef.current?.click();
            }
          }}
          sx={{
            position: 'relative',
            border: `2px dashed ${theme.palette.orange.main}`,
            backgroundColor: `${theme.palette.orange.main}12`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          <input
            ref={contentImageInputRef}
            accept="image/*"
            type="file"
            aria-label="Upload content image"
            style={{ display: 'none' }}
            onChange={handleContentImageUpload}
          />

          {hasContentImage ? (
            <Box
              component="img"
              src={page.imageUrl}
              alt={page.title || 'Content preview'}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
              }}
            />
          ) : (
            <Box sx={{ textAlign: 'center', px: 2 }}>
              <AddCircleOutline sx={{ color: 'orange.main', fontSize: 42 }} />
              <Typography sx={{ mt: 1, fontFamily: 'Quicksand, sans-serif', fontWeight: 800 }}>
                Upload Content Image
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  if (isInteractivePage) {
    const interactiveSurfaceBg = hasInteractiveBackground ? 'rgba(255, 255, 255, 0.78)' : 'transparent';

    return (
      <Box
        sx={{
          width: '100%',
          aspectRatio: '1920 / 1080',
          borderRadius: 0,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.border.main}`,
          backgroundColor: hasInteractiveBackground ? 'transparent' : theme.palette.common.white,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {hasInteractiveBackground ? (
          <Box
            component="img"
            src={page.backgroundImageUrl}
            alt=""
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        ) : null}

        <input
          ref={interactiveBackgroundInputRef}
          accept="image/*"
          type="file"
          style={{ display: 'none' }}
          aria-label="Upload interactive page background image"
          onChange={handleInteractiveBackgroundUpload}
        />

        <Typography
          role="button"
          tabIndex={0}
          aria-label={
            hasInteractiveBackground
              ? 'Change background image for interactive page'
              : 'Upload background image for interactive page'
          }
          onClick={(event) => {
            event.stopPropagation();
            interactiveBackgroundInputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              interactiveBackgroundInputRef.current?.click();
            }
          }}
          sx={{
            position: 'absolute',
            top: 10,
            left: 12,
            zIndex: 3,
            color: 'orange.dark',
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: { xs: '0.72rem', md: '0.82rem' },
            textDecoration: 'underline',
            cursor: 'pointer',
            maxWidth: { xs: '42%', sm: 'none' },
            textAlign: 'left',
            lineHeight: 1.25,
          }}
        >
          {hasInteractiveBackground ? 'Change background image' : 'Upload background image'}
        </Typography>

        <Typography
          role="button"
          tabIndex={0}
          aria-label={`Change page type for page ${pageIndex + 1}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpenTypeMenu(event.currentTarget);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              onOpenTypeMenu(event.currentTarget);
            }
          }}
          sx={{
            position: 'absolute',
            top: 10,
            right: 12,
            zIndex: 3,
            color: 'orange.dark',
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: { xs: '0.72rem', md: '0.82rem' },
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Change page type
        </Typography>

        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 1.5, md: 2 },
            pt: { xs: 4, md: 4.5 },
            gap: 1.5,
            boxSizing: 'border-box',
          }}
        >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: 'minmax(0, 6.8fr) minmax(0, 3.3fr)',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              border: `2px dashed ${theme.palette.secondary.main}`,
              borderRadius: '12px',
              p: 1,
              minHeight: 0,
              display: 'flex',
              gridTemplateColumns: isParallelInteractive
                ? 'minmax(200px, 1fr) minmax(200px, 1fr)'
                : 'minmax(200px, 1fr)',
              gap: 1,
              alignItems: 'start',
              backgroundColor: interactiveSurfaceBg,
            }}
          >
            <Box sx={{ display: 'grid', gap: 1, minWidth: '150px', marginTop: 'auto', marginX: 'auto'	 }}>
                <TextField
                  label="Answer 1 matches"
                  size="small"
                  select
                  SelectProps={interactiveSelectProps}
                  value={page.answerOneCorrectOptionId || ''}
                  onChange={(event) => {
                    const nextAnswerOne = event.target.value;
                    if (isParallelInteractive) {
                      onPatch({
                        answerOneCorrectOptionId: nextAnswerOne,
                        answerTwoCorrectOptionId: getOppositeInteractiveOption(nextAnswerOne),
                      });
                      return;
                    }
                    onPatch({ answerOneCorrectOptionId: nextAnswerOne });
                  }}
                >
                  {interactiveOptionChoices.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              {renderInteractiveUploadCard({
                fieldKey: 'guideImageOne',
                label: 'Answer 1 image',
                accept: 'image/*',
                previewType: 'image',
                emptyText: 'Click to upload answer 1 image',
                loadedText: 'Answer image uploaded',
                isAnswerImage: true,
              })}
            </Box>

            {isParallelInteractive ? (
              <Box sx={{ display: 'grid', gap: 1, minWidth: 0, marginTop: 'auto', marginX: 'auto' }}>
                <TextField
                  label="Answer 2 matches"
                  size="small"
                  select
                  SelectProps={interactiveSelectProps}
                  value={page.answerTwoCorrectOptionId || ''}
                  onChange={(event) => {
                    const nextAnswerTwo = event.target.value;
                    onPatch({
                      answerTwoCorrectOptionId: nextAnswerTwo,
                      answerOneCorrectOptionId: getOppositeInteractiveOption(nextAnswerTwo),
                    });
                  }}
                >
                  {interactiveOptionChoices.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                {renderInteractiveUploadCard({
                  fieldKey: 'guideImageTwo',
                  label: 'Answer 2 image',
                  accept: 'image/*',
                  previewType: 'image',
                  emptyText: 'Click to upload answer 2 image',
                  loadedText: 'Answer image uploaded',
                  isAnswerImage: true,
                })}
              </Box>
            ) : null}
          </Box>

          <Box
            sx={{
              minHeight: 0,
              maxHeight: '100%',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)',
              gap: 1,
              alignContent: 'start',
              alignItems: 'start',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                minWidth: 0,
                width: '100%',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              {renderInteractiveUploadCard({
                fieldKey: 'optionImageOne',
                accept: 'image/*',
                previewType: 'image',
                emptyText: 'Click to upload option 1 icon',
                loadedText: 'Option icon uploaded',
                isOptionIcon: true,
              })}
              {renderOptionAudioLink('optionAudioOne')}
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                minWidth: 0,
                width: '100%',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              {renderInteractiveUploadCard({
                fieldKey: 'optionImageTwo',
                accept: 'image/*',
                previewType: 'image',
                emptyText: 'Click to upload option 2 icon',
                loadedText: 'Option icon uploaded',
                isOptionIcon: true,
              })}
              {renderOptionAudioLink('optionAudioTwo')}
            </Box>
          </Box>
        </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={
        isIntroPage
          ? `Upload intro image for page ${pageIndex + 1}`
          : isVideoUploadPage
            ? `Upload ${isRewardPage ? 'reward' : 'demo'} video for page ${pageIndex + 1}`
          : `Add content type for page ${pageIndex + 1}`
      }
      onClick={(event) => handleDropAreaAction(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleDropAreaAction(event.currentTarget);
        }
      }}
      sx={{
        width: '100%',
        aspectRatio: '1920 / 1080',
        borderRadius: hasPrimaryMedia ? 0 : '22px',
        border: `2px dashed ${theme.palette.orange.main}`,
        backgroundColor: `${theme.palette.orange.main}12`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        alignSelf: 'center',
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 4 },
        textAlign: 'center',
        overflow: 'hidden',
        position: 'relative',
        '&:hover': {
          backgroundColor: `${theme.palette.orange.main}1c`,
        },
      }}
    >
      <input
        ref={introImageInputRef}
        accept="image/*"
        type="file"
        aria-label="Upload intro image"
        style={{ display: 'none' }}
        onChange={handleIntroImageUpload}
      />
      <input
        ref={demoVideoInputRef}
        accept="video/*"
        type="file"
        aria-label="Upload demo video"
        style={{ display: 'none' }}
        onChange={handleDemoVideoUpload}
      />

      {isIntroPage && hasIntroImage ? (
        <Box
          component="img"
          src={page.imageUrl}
          alt={page.title || 'Intro preview'}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'fill',
          }}
        />
      ) : null}
      {isVideoUploadPage && hasUploadedVideo ? (
        <Box
          component="video"
          src={page.videoUrl}
          muted
          loop
          autoPlay
          playsInline
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'fill',
          }}
        />
      ) : null}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 2,
          py: 2,
          borderRadius: '14px',
          backgroundColor: (isIntroPage && hasIntroImage) || (isVideoUploadPage && hasUploadedVideo)
            ? 'rgba(0, 0, 0, 0.35)'
            : 'transparent',
        }}
      >
      {hasPrimaryMedia ? null : <AddCircleOutline sx={{ color: 'orange.main', fontSize: 42 }} />}
      <Typography
        sx={{
          mt: 1.2,
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 800,
          fontSize: selectedLabel ? { xs: '1.15rem', md: '1.35rem' } : '1rem',
          color: hasPrimaryMedia ? 'common.white' : selectedLabel ? 'orange.dark' : 'text.primary',
        }}
      >
        {isIntroPage
          ? (hasIntroImage ? 'Click to replace intro image' : 'Upload Intro Image')
          : isVideoUploadPage
            ? (hasUploadedVideo ? `Click to replace ${isRewardPage ? 'reward' : 'demo'} video` : `Upload ${isRewardPage ? 'Reward' : 'Demo'} Video`)
          : selectedLabel || 'Add Content'}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          color: hasPrimaryMedia ? 'common.white' : 'text.secondary',
        }}
      >
        {isIntroPage
          ? 'Image fills the full create area'
          : isVideoUploadPage
            ? 'Video fills the full create area'
          : 'Click to choose page type'}
      </Typography>
      </Box>
    </Box>
  );
};

export default BooksBuilderTypeDropArea;
