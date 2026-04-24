import React, { useRef, useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AddCircleOutline } from '@mui/icons-material';
import { PAGE_TYPES } from './BooksBuilderCreate.constants';
import bigLogo from '../../../assets/images/big-logo.png';

const BooksBuilderTypeDropArea = ({ page, pageIndex, onOpenTypeMenu, onPatch }) => {
  const theme = useTheme();
  const introUploadInputRef = useRef(null);
  const selectedLabel = PAGE_TYPES.find((item) => item.key === page.type)?.label || null;
  const isIntroPage = page.type === 'intro';
  const isContentPage = page.type === 'content';
  const hasIntroImage = Boolean(page.imageUrl);
  const hasContentImage = Boolean(page.imageUrl);
  const [isSubtitleEditing, setIsSubtitleEditing] = useState(false);

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
      introUploadInputRef.current?.click();
      return;
    }
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

          {isSubtitleEditing ? (
            <TextField
              autoFocus
              multiline
              minRows={2}
              value={page.subtitle || ''}
              placeholder="Subtitle will appear here"
              onChange={(event) => onPatch({ subtitle: event.target.value })}
              onBlur={() => setIsSubtitleEditing(false)}
              onClick={(event) => event.stopPropagation()}
              aria-label="Edit content subtitle"
              sx={{
                width: '100%',
                maxWidth: '88%',
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 800,
                  fontSize: { xs: '2rem', md: '2.7rem' },
                  textAlign: 'center',
                },
                '& .MuiOutlinedInput-input': {
                  textAlign: 'center',
                },
                '& .MuiOutlinedInput-input::placeholder': {
                  opacity: 1,
                  textAlign: 'center',
                },
              }}
            />
          ) : (
            <Typography
              role="button"
              tabIndex={0}
              aria-label="Edit subtitle"
              onClick={() => setIsSubtitleEditing(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setIsSubtitleEditing(true);
                }
              }}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 800,
                fontSize: { xs: '2rem', md: '2.7rem' },
                color: '#141414',
                textAlign: 'center',
                px: 2,
                cursor: 'text',
                maxWidth: '88%',
              }}
            >
              {page.subtitle || 'Click here to edit subtitle'}
            </Typography>
          )}

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
            introUploadInputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              introUploadInputRef.current?.click();
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
            ref={introUploadInputRef}
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

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={
        isIntroPage
          ? `Upload intro image for page ${pageIndex + 1}`
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
        borderRadius: hasIntroImage ? 0 : '22px',
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
        ref={introUploadInputRef}
        accept="image/*"
        type="file"
        aria-label="Upload intro image"
        style={{ display: 'none' }}
        onChange={handleIntroImageUpload}
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
          backgroundColor: isIntroPage && hasIntroImage ? 'rgba(0, 0, 0, 0.35)' : 'transparent',
        }}
      >
      {hasIntroImage ? null : <AddCircleOutline sx={{ color: 'orange.main', fontSize: 42 }} />}
      <Typography
        sx={{
          mt: 1.2,
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 800,
          fontSize: selectedLabel ? { xs: '1.15rem', md: '1.35rem' } : '1rem',
          color: hasIntroImage ? 'common.white' : selectedLabel ? 'orange.dark' : 'text.primary',
        }}
      >
        {isIntroPage ? (hasIntroImage ? 'Click to replace intro image' : 'Upload Intro Image') : selectedLabel || 'Add Content'}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          color: hasIntroImage ? 'common.white' : 'text.secondary',
        }}
      >
        {isIntroPage ? 'Image fills the full create area' : 'Click to choose page type'}
      </Typography>
      </Box>
    </Box>
  );
};

export default BooksBuilderTypeDropArea;
