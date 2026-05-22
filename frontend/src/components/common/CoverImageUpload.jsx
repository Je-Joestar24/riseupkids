import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  AddPhotoAlternate as AddPhotoAlternateIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { getCoverImageUrl } from '../../utils/coverImageUrl';
import {
  COVER_ASPECT_RATIO,
  COVER_DROPZONE_MAX_WIDTH,
  getContentFormPaperSx,
} from './contentFormBento';

/**
 * Bento-style cover image picker (dashed placeholder, portrait 6:4 ratio).
 * Matches Explore / Star Cam content-creation patterns.
 */
const CoverImageUpload = ({
  label = 'Cover photo',
  file,
  onFileChange,
  existingCoverPath = null,
  helperText = 'JPEG, PNG, GIF, or WebP · max 10 MB',
  required = false,
  disabled = false,
  aspectRatio = COVER_ASPECT_RATIO,
  wrapped = true,
  inputId = 'cover-image-upload-input',
}) => {
  const theme = useTheme();
  const inputRef = useRef(null);
  const [hideExisting, setHideExisting] = useState(false);

  useEffect(() => {
    setHideExisting(false);
  }, [existingCoverPath]);

  const filePreviewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!filePreviewUrl) return undefined;
    return () => URL.revokeObjectURL(filePreviewUrl);
  }, [filePreviewUrl]);

  const previewUrl =
    filePreviewUrl ||
    (!hideExisting && existingCoverPath ? getCoverImageUrl(existingCoverPath) : null);

  const handleChange = (e) => {
    const next = e.target.files?.[0] || null;
    onFileChange(next);
    e.target.value = '';
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setHideExisting(true);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const dropZone = (
    <Stack spacing={1.25}>
      <Box>
        <Typography
          sx={{
            fontWeight: 700,
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.primary,
          }}
        >
          {label}
          {required ? (
            <Typography component="span" color="error.main">
              {' '}
              *
            </Typography>
          ) : (
            <Typography component="span" color="text.secondary" variant="body2">
              {' '}
              (optional)
            </Typography>
          )}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontFamily: 'Quicksand, sans-serif', display: 'block', mt: 0.25 }}
        >
          Shown on the child home live card · {aspectRatio.replace(/\s/g, '')} ratio
        </Typography>
      </Box>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        disabled={disabled}
        onChange={handleChange}
        aria-label={label}
      />

      <Box
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={previewUrl ? `Change ${label}` : `Upload ${label}`}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        sx={{
          width: '100%',
          aspectRatio,
          maxWidth: COVER_DROPZONE_MAX_WIDTH,
          minWidth: { md: 320 },
          mx: { xs: 'auto', md: 0 },
          borderRadius: '12px',
          border: previewUrl
            ? `1px solid ${theme.palette.divider}`
            : `2px dashed ${theme.palette.orange?.main || theme.palette.primary.main}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          backgroundColor:
            theme.palette.mode === 'dark'
              ? theme.palette.grey[900]
              : theme.palette.grey[50],
          opacity: disabled ? 0.7 : 1,
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': disabled
            ? {}
            : {
                borderColor: theme.palette.orange?.main || theme.palette.primary.main,
                boxShadow: `0 0 0 1px ${theme.palette.orange?.main || theme.palette.primary.main}22`,
              },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.orange?.main || theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        }}
      >
        {previewUrl ? (
          <>
            <Box
              component="img"
              src={previewUrl}
              alt="Cover preview"
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <Button
              size="small"
              variant="contained"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                openPicker();
              }}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                minWidth: 'unset',
                px: 1.25,
                py: 0.35,
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                backgroundColor: theme.palette.orange?.main || theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: theme.palette.orange?.dark || theme.palette.primary.dark,
                },
              }}
            >
              Change
            </Button>
            {(file || existingCoverPath) && (
              <IconButton
                size="small"
                aria-label="Remove cover photo"
                disabled={disabled}
                onClick={handleClear}
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  color: '#fff',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.6)' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </>
        ) : (
          <Stack alignItems="center" spacing={1} sx={{ px: 2, textAlign: 'center' }}>
            <AddPhotoAlternateIcon
              sx={{
                fontSize: 72,
                color: theme.palette.orange?.main || theme.palette.primary.main,
                opacity: 0.85,
              }}
              aria-hidden
            />
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              Click to upload cover
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: 'Quicksand, sans-serif' }}
            >
              Portrait · 6×4
            </Typography>
          </Stack>
        )}
      </Box>

      {file && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontFamily: 'Quicksand, sans-serif' }}
          noWrap
          title={file.name}
        >
          {file.name}
        </Typography>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontFamily: 'Quicksand, sans-serif' }}
      >
        {helperText}
      </Typography>
    </Stack>
  );

  if (!wrapped) return dropZone;

  return (
    <Paper variant="outlined" sx={getContentFormPaperSx(theme)}>
      {dropZone}
    </Paper>
  );
};

export default CoverImageUpload;
