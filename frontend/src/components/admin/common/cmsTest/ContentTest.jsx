import React from 'react';
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
            key={`${page?.pageId || page?.id || 'content'}-audio`}
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
            {page?.subtitle || 'Subtitle'}
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
          left: { xs: 12, md: 18 },
          bottom: { xs: 44, md: 106 },
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
          right: { xs: 12, md: 18 },
          bottom: { xs: 44, md: 106 },
        }}
      >
        <img src={contentNextButtonImage} alt="Next button" />
      </IconButton>
    </Box>
  );
};

export default ContentTest;
