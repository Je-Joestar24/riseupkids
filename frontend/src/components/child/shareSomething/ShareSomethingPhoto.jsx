import React, { useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import cameraIcon from '../../../assets/images/camera.png';

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

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file && onPhotoSelect) {
      onPhotoSelect(file);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        padding: '24px',
        border: '4px solid',
        borderColor: themeColors.secondary,
        borderRadius: '0px',
        backgroundColor: 'white',
        boxShadow: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px',
      }}
    >
      {/* First Row: Title with Icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '10px',
        }}
      >
        <Box
          component="img"
          src={cameraIcon}
          alt="Camera"
          sx={{
            width: '80px',
            height: '80px',
            objectFit: 'contain',
          }}
        />
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '24px',
            fontWeight: 700,
            color: themeColors.secondary,
            lineHeight: 1.2,
          }}
        >
          Add a Photo!
        </Typography>
      </Box>

      {/* Second Row: Clickable Upload Area */}
      <Box
        component="button"
        onClick={handleClick}
        type="button"
        sx={{
          width: '784px',
          height: '784px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: selectedPhoto ? '0' : '40px',
          border: selectedPhoto ? '4px solid' : '4px dashed',
          borderColor: selectedPhoto ? themeColors.accent : themeColors.secondary,
          borderRadius: '0px',
          backgroundColor: 'white',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: selectedPhoto ? 'white' : `${themeColors.primary}33`, // Primary color with 0.2 opacity (33 in hex = ~20%)
          },
        }}
        aria-label="Tap to add a photo"
      >
        {selectedPhoto ? (
          <>
            {/* Photo Preview - Cover the whole area */}
            <Box
              component="img"
              src={URL.createObjectURL(selectedPhoto)}
              alt="Selected photo"
              sx={{
                width: '784px',
                height: '784px',
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />
            {/* Change Photo Button */}
            <Box
              component="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              type="button"
              sx={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '8px 16px',
                backgroundColor: themeColors.textInverse,
                color: themeColors.orange,
                border: 'none',
                borderRadius: '0px',
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '18px',
                fontWeight: 600,
                cursor: 'pointer',
                zIndex: 1,
                transition: 'transform 0.3s ease',
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
          <>
            {/* First Row: Camera Icon */}
            <CameraIcon color={themeColors.secondary} size={64} />

            {/* Second Row: "Tap to Add a Photo!" */}
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '24px',
                fontWeight: 600,
                color: themeColors.secondary,
                lineHeight: 1.3,
                textAlign: 'center',
              }}
            >
              Tap to Add a Photo!
            </Typography>

            {/* Third Row: "Ask a grown-up to help" */}
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '18px',
                fontWeight: 600,
                color: 'oklch(0.551 0.027 264.364)',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              Ask a grown-up to help!
            </Typography>
          </>
        )}
      </Box>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-label="Photo upload input"
      />
    </Box>
  );
};

export default ShareSomethingPhoto;
