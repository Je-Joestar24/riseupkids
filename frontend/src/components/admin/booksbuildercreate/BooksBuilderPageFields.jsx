import React, { useRef, useState } from 'react';
import { Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import useAudioFileWithSilenceTrim from '../../../hooks/useAudioFileWithSilenceTrim';
import { parseMediaUploadResponse } from '../../../services/cmsBookAdminService';
import { CONTENT_READING_FONT_SIZE_PRESETS } from '../../../utils/cmsContentReading';
import { isPageComplete } from './BooksBuilderCreate.utils';

const BooksBuilderPageFields = ({ page, onPatch, uploadBookMedia }) => {
  if (!page?.type) return null;
  const contentAudioInputRef = useRef(null);
  const introBgmInputRef = useRef(null);
  const rewardAudioInputRef = useRef(null);
  const { isTrimming, processAudioFile } = useAudioFileWithSilenceTrim();
  const [isUploadingContentAudio, setIsUploadingContentAudio] = useState(false);

  const revokePreviewUrl = (url) => {
    if (String(url || '').startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  const handleIntroBackgroundMusicUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const trimmed = await processAudioFile(file);
    if (!trimmed?.audioUrl) return;

    revokePreviewUrl(page.introBackgroundMusicUrl);
    onPatch({
      introBackgroundMusicUrl: trimmed.audioUrl,
      introBackgroundMusicMediaId: null,
    });
  };

  const handleRemoveIntroBackgroundMusic = () => {
    revokePreviewUrl(page.introBackgroundMusicUrl);
    onPatch({
      introBackgroundMusicUrl: '',
      introBackgroundMusicMediaId: null,
    });
  };

  const handleRewardAudioUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const trimmed = await processAudioFile(file);
    if (!trimmed?.audioUrl) return;

    revokePreviewUrl(page.rewardAudioUrl);
    onPatch({
      rewardAudioUrl: trimmed.audioUrl,
      rewardAudioMediaId: null,
    });
  };

  const handleRemoveRewardAudio = () => {
    revokePreviewUrl(page.rewardAudioUrl);
    onPatch({
      rewardAudioUrl: '',
      rewardAudioMediaId: null,
    });
  };

  const handleContentAudioUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    if (!uploadBookMedia) {
      return;
    }

    setIsUploadingContentAudio(true);
    try {
      const response = await uploadBookMedia({
        file,
        mediaType: 'audio',
        title: `${page.title || 'Content'} narration`,
        preTrimmed: false,
      });
      const uploaded = parseMediaUploadResponse(response);
      if (!uploaded.url) return;

      revokePreviewUrl(page.audioUrl);
      onPatch({
        audioUrl: uploaded.url,
        audioMediaId: uploaded.mediaId,
        audioDurationSec: uploaded.durationSec,
        audioTrimMeta: uploaded.trimMeta
          ? { ...uploaded.trimMeta, source: 'backend' }
          : null,
      });
    } finally {
      setIsUploadingContentAudio(false);
    }
  };

  const isContentAudioBusy = isUploadingContentAudio;

  return (
    <Stack spacing={1.5} sx={{ width: '100%', alignSelf: 'center', pt: 1 }}>
      {page.type === 'intro' ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              border: (theme) => `1px solid ${theme.palette.border.main}`,
              borderRadius: '10px',
              backgroundColor: (theme) => theme.palette.common.white,
              px: 1.5,
              py: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <TextField
              label="Page title"
              size="small"
              fullWidth
              value={page.title}
              onChange={(e) => onPatch({ title: e.target.value })}
              aria-label="Intro page title"
              sx={{
                '& .MuiInputBase-root': { minHeight: 40 },
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: 'text.secondary',
                fontWeight: 700,
                fontSize: '0.72rem',
                lineHeight: 1.2,
              }}
            >
              Intro background music (optional)
            </Typography>

            {page.introBackgroundMusicUrl ? (
              <Box
                sx={{
                  border: (theme) => `1px solid ${theme.palette.border.main}`,
                  borderRadius: '10px',
                  backgroundColor: (theme) => theme.palette.common.white,
                  px: 1.25,
                  py: 0.75,
                  minHeight: 52,
                  height: 52,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <audio
                  controls
                  src={page.introBackgroundMusicUrl}
                  aria-label="Intro background music preview"
                  style={{ flex: 1, minWidth: 0, height: 36, display: 'block' }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  disabled={isTrimming}
                  onClick={() => introBgmInputRef.current?.click()}
                  aria-label="Replace intro background music"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    minHeight: 28,
                    py: 0.25,
                    px: 1,
                    borderRadius: '999px',
                    flexShrink: 0,
                  }}
                >
                  Replace
                </Button>
                <Button
                  variant="text"
                  size="small"
                  color="error"
                  onClick={handleRemoveIntroBackgroundMusic}
                  aria-label="Remove intro background music"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    minHeight: 28,
                    py: 0.25,
                    px: 0.75,
                    flexShrink: 0,
                  }}
                >
                  Remove
                </Button>
              </Box>
            ) : (
              <Box
                role="button"
                tabIndex={isTrimming ? -1 : 0}
                aria-label="Upload intro background music"
                aria-busy={isTrimming}
                onClick={() => {
                  if (!isTrimming) introBgmInputRef.current?.click();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (!isTrimming) introBgmInputRef.current?.click();
                  }
                }}
                sx={{
                  border: (theme) => `2px dashed ${theme.palette.orange.main}`,
                  borderRadius: '10px',
                  minHeight: 52,
                  height: 52,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 1.5,
                  backgroundColor: (theme) => `${theme.palette.orange.main}10`,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    lineHeight: 1.25,
                  }}
                >
                  {isTrimming ? 'Trimming silence...' : 'Click to upload audio (loops on intro)'}
                </Typography>
              </Box>
            )}

            <input
              ref={introBgmInputRef}
              accept="audio/*"
              type="file"
              style={{ display: 'none' }}
              aria-hidden
              disabled={isTrimming}
              onChange={handleIntroBackgroundMusicUpload}
            />
          </Box>
        </Box>
      ) : null}

      {page.type === 'reward' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: '0.72rem',
              lineHeight: 1.2,
            }}
          >
            Reward celebration audio (optional)
          </Typography>

          {page.rewardAudioUrl ? (
            <Box
              sx={{
                border: (theme) => `1px solid ${theme.palette.border.main}`,
                borderRadius: '10px',
                backgroundColor: (theme) => theme.palette.common.white,
                px: 1.25,
                py: 0.75,
                minHeight: 52,
                height: 52,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <audio
                controls
                src={page.rewardAudioUrl}
                aria-label="Reward celebration audio preview"
                style={{ flex: 1, minWidth: 0, height: 36, display: 'block' }}
              />
              <Button
                variant="outlined"
                size="small"
                disabled={isTrimming}
                onClick={() => rewardAudioInputRef.current?.click()}
                aria-label="Replace reward celebration audio"
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  minHeight: 28,
                  py: 0.25,
                  px: 1,
                  borderRadius: '999px',
                  flexShrink: 0,
                }}
              >
                Replace
              </Button>
              <Button
                variant="text"
                size="small"
                color="error"
                onClick={handleRemoveRewardAudio}
                aria-label="Remove reward celebration audio"
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  minHeight: 28,
                  py: 0.25,
                  px: 0.75,
                  flexShrink: 0,
                }}
              >
                Remove
              </Button>
            </Box>
          ) : (
            <Box
              role="button"
              tabIndex={isTrimming ? -1 : 0}
              aria-label="Upload reward celebration audio"
              aria-busy={isTrimming}
              onClick={() => {
                if (!isTrimming) rewardAudioInputRef.current?.click();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  if (!isTrimming) rewardAudioInputRef.current?.click();
                }
              }}
              sx={{
                border: (theme) => `2px dashed ${theme.palette.orange.main}`,
                borderRadius: '10px',
                minHeight: 52,
                height: 52,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 1.5,
                backgroundColor: (theme) => `${theme.palette.orange.main}10`,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  lineHeight: 1.25,
                }}
              >
                {isTrimming ? 'Trimming silence...' : 'Click to upload celebration audio (plays once on reward)'}
              </Typography>
            </Box>
          )}

          <input
            ref={rewardAudioInputRef}
            accept="audio/*"
            type="file"
            style={{ display: 'none' }}
            aria-hidden
            disabled={isTrimming}
            onChange={handleRewardAudioUpload}
          />
        </Box>
      ) : null}

      {page.type === 'content' ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            alignItems: 'stretch',
          }}
        >
          <Box
            sx={{
              border: (theme) => `1px solid ${theme.palette.border.main}`,
              borderRadius: '12px',
              backgroundColor: (theme) => theme.palette.common.white,
              p: 1.5,
              minHeight: '126px',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 4fr) minmax(0, 1fr)' },
              gap: { xs: 1.5, sm: 1.25 },
              alignItems: 'start',
            }}
          >
            <TextField
              label="Reading text"
              multiline
              minRows={3}
              size="small"
              fullWidth
              value={page.readingText || page.subtitle || ''}
              onChange={(e) => onPatch({ readingText: e.target.value, subtitle: e.target.value })}
              aria-label="Content reading text"
              sx={{ minWidth: 0 }}
            />
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
              onChange={(e) => {
                const next = e.target.value;
                onPatch({
                  readingFontSizePx: next === '' ? null : Number(next),
                });
              }}
              aria-label="Content reading font size"
              sx={{
                minWidth: 0,
                '& .MuiSelect-select': {
                  fontSize: '0.8rem',
                  py: 1,
                },
              }}
            >
              {CONTENT_READING_FONT_SIZE_PRESETS.map((preset) => (
                <MenuItem key={preset.value || 'default'} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography
              variant="caption"
              sx={{ fontFamily: 'Quicksand, sans-serif', color: 'text.secondary', fontWeight: 700 }}
            >
              Content audio
            </Typography>

            {page.audioUrl ? (
              <Box
                sx={{
                  border: (theme) => `1px solid ${theme.palette.border.main}`,
                  borderRadius: '12px',
                  backgroundColor: (theme) => theme.palette.common.white,
                  p: 1.5,
                  minHeight: '126px',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                <audio
                  controls
                  src={page.audioUrl}
                  aria-label="Content audio player"
                  style={{ width: '100%' }}
                />
                {page.audioDurationSec ? (
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      left: 12,
                      top: 10,
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 700,
                      color: 'text.secondary',
                    }}
                  >
                    {page.audioTrimMeta?.applied && page.audioTrimMeta?.originalDurationSec
                      ? `Duration: ${Number(page.audioDurationSec).toFixed(2)}s (trimmed from ${Number(page.audioTrimMeta.originalDurationSec).toFixed(2)}s, 0.2s edge kept)`
                      : `Duration: ${Number(page.audioDurationSec).toFixed(2)}s`}
                  </Typography>
                ) : null}
                <Button
                  variant="contained"
                  size="small"
                  disabled={isContentAudioBusy}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isContentAudioBusy) contentAudioInputRef.current?.click();
                  }}
                  aria-label="Change content audio"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    minWidth: 'unset',
                    px: 1.2,
                    py: 0.2,
                    borderRadius: '999px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    lineHeight: 1.2,
                  }}
                >
                  Change
                </Button>
              </Box>
            ) : (
              <Box
                role="button"
                tabIndex={isContentAudioBusy ? -1 : 0}
                aria-label="Upload content audio"
                aria-busy={isContentAudioBusy}
                onClick={() => {
                  if (!isContentAudioBusy) contentAudioInputRef.current?.click();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    contentAudioInputRef.current?.click();
                  }
                }}
                sx={{
                  border: (theme) => `2px dashed ${theme.palette.orange.main}`,
                  borderRadius: '12px',
                  minHeight: '126px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  px: 2,
                  backgroundColor: (theme) => `${theme.palette.orange.main}10`,
                  cursor: isContentAudioBusy ? 'wait' : 'pointer',
                  textAlign: 'center',
                }}
              >
                {isContentAudioBusy ? (
                  <CircularProgress size={28} aria-label="Uploading and trimming audio" />
                ) : null}
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>
                  {isContentAudioBusy ? 'Uploading & trimming on server...' : 'Click to upload audio'}
                </Typography>
              </Box>
            )}
          </Box>

          <input
            ref={contentAudioInputRef}
            accept="audio/*"
            id={`content-audio-upload-${page.id}`}
            type="file"
            style={{ display: 'none' }}
            onChange={handleContentAudioUpload}
          />
        </Box>
      ) : null}

      {page.type === 'interactive' ? (
        <Typography
          variant="caption"
          sx={{ fontFamily: 'Quicksand, sans-serif', color: 'text.secondary', fontWeight: 700 }}
        >
          Use the layout canvas to position elements. Upload background, scene images, answers, and options from the
          side panel.
        </Typography>
      ) : null}

      <Typography
        variant="caption"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          color: isPageComplete(page) ? 'success.main' : 'warning.main',
          fontWeight: 700,
        }}
      >
        {isPageComplete(page) ? 'Page requirements completed' : 'Complete required fields to unlock next page'}
      </Typography>
    </Stack>
  );
};

export default BooksBuilderPageFields;
