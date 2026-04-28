import React, { useRef } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { isPageComplete } from './BooksBuilderCreate.utils';

const BooksBuilderPageFields = ({ page, onPatch }) => {
  if (!page?.type) return null;
  const contentAudioInputRef = useRef(null);

  const handleContentAudioUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onPatch({ audioUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <Stack spacing={1.5} sx={{ width: '100%', alignSelf: 'center', pt: 1 }}>
      {page.type !== 'content' ? (
        <TextField
          label="Page title"
          size="small"
          value={page.title}
          onChange={(e) => onPatch({ title: e.target.value })}
        />
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
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontFamily: 'Quicksand, sans-serif', color: 'text.secondary', fontWeight: 700, mb: 1 }}
            >
              Content title
            </Typography>
            <TextField
              label="Page title"
              size="small"
              value={page.title}
              onChange={(e) => onPatch({ title: e.target.value })}
            />
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
                <Button
                  variant="contained"
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    contentAudioInputRef.current?.click();
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
                tabIndex={0}
                aria-label="Upload content audio"
                onClick={() => contentAudioInputRef.current?.click()}
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
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 2,
                  backgroundColor: (theme) => `${theme.palette.orange.main}10`,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>
                  Click to upload audio
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
          Use the top-left link in the canvas to upload the full-page background image, then add answers, options, and
          mappings in the same area.
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
