import React, { useRef, useEffect, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import cameraIcon from '../../../assets/images/camera.png';

/** Full-width perfect square upload area (matches original desktop design). */
const SQUARE_ASPECT = '1 / 1';

/**
 * Camera Icon Component (SVG)
 */
const CameraIcon = ({ color = 'currentColor', size = 64 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"></path>
    <circle cx="12" cy="13" r="3"></circle>
  </svg>
);

/**
 * ShareSomethingPhoto Component
 *
 * Photo upload section for Share Something page
 */
const ShareSomethingPhoto = ({ onPhotoSelect, selectedPhoto }) => {
  const fileInputRef = useRef(null);

  const previewUrl = useMemo(
    () => (selectedPhoto ? URL.createObjectURL(selectedPhoto) : null),
    [selectedPhoto]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file && onPhotoSelect) {
      onPhotoSelect(file);
    }
    event.target.value = '';
  };

  return (
    <Box
      sx={{
        width: '100%',
        padding: { xs: '16px', sm: '24px' },
        border: '4px solid',
        borderColor: themeColors.secondary,
        borderRadius: '0px',
        backgroundColor: 'white',
        boxShadow:
          'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: '8px', sm: '12px' },
          marginBottom: '10px',
        }}
      >
        <Box
          component="img"
          src={cameraIcon}
          alt=""
          sx={{
            width: { xs: '56px', sm: '80px' },
            height: { xs: '56px', sm: '80px' },
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '1.25rem', sm: '24px' },
            fontWeight: 700,
            color: themeColors.secondary,
            lineHeight: 1.2,
          }}
        >
          Add a Photo!
        </Typography>
      </Box>

      <Box
        component="button"
        type="button"
        onClick={handleClick}
        sx={{
          display: 'block',
          width: '100%',
          aspectRatio: SQUARE_ASPECT,
          position: 'relative',
          padding: 0,
          border: selectedPhoto ? '4px solid' : '4px dashed',
          borderColor: selectedPhoto ? themeColors.accent : themeColors.secondary,
          borderRadius: '0px',
          backgroundColor: 'white',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          WebkitTapHighlightColor: 'transparent',
          '&:hover': {
            backgroundColor: selectedPhoto ? 'white' : `${themeColors.primary}33`,
          },
        }}
        aria-label={selectedPhoto ? 'Change photo' : 'Tap to add a photo'}
      >
        {selectedPhoto && previewUrl ? (
          <>
            <Box
              component="img"
              src={previewUrl}
              alt="Selected photo preview"
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <Box
              component="span"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClick();
                }
              }}
              sx={{
                position: 'absolute',
                top: { xs: '8px', sm: '16px' },
                right: { xs: '8px', sm: '16px' },
                padding: { xs: '6px 10px', sm: '8px 16px' },
                backgroundColor: themeColors.textInverse,
                color: themeColors.orange,
                borderRadius: '0px',
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '0.875rem', sm: '18px' },
                fontWeight: 600,
                cursor: 'pointer',
                zIndex: 1,
                lineHeight: 1.2,
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
              aria-label="Change photo"
            >
              ✕ Change Photo
            </Box>
          </>
        ) : (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: { xs: '12px', sm: '16px' },
              padding: { xs: '16px', sm: '40px' },
            }}
          >
            <CameraIcon color={themeColors.secondary} size={64} />
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '1.125rem', sm: '24px' },
                fontWeight: 600,
                color: themeColors.secondary,
                lineHeight: 1.3,
                textAlign: 'center',
              }}
            >
              Tap to Add a Photo!
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '0.9375rem', sm: '18px' },
                fontWeight: 600,
                color: 'oklch(0.551 0.027 264.364)',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              Ask a grown-up to help!
            </Typography>
          </Box>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-label="Photo upload input"
      />
    </Box>
  );
};

export default ShareSomethingPhoto;
