import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';

const BentoCoverImageField = ({
  theme,
  id,
  previewUrl,
  fileName,
  onFileChange,
  onClearFile,
  title = 'Cover image',
  description = 'Optional thumbnail for the content card.',
  uploadAriaLabel = 'Upload cover image',
}) => (
  <Stack spacing={1.5}>
    <Box>
      <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, mb: 0.5 }}>{title}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
        {description}
      </Typography>
    </Box>
    <input
      accept="image/*"
      style={{ display: 'none' }}
      id={id}
      type="file"
      aria-label={`Select ${title.toLowerCase()}`}
      onChange={onFileChange}
    />
    <Box
      component="label"
      htmlFor={id}
      role="button"
      tabIndex={0}
      aria-label={previewUrl ? `Change ${title.toLowerCase()}` : uploadAriaLabel}
      sx={{
        width: '100%',
        ...(previewUrl
          ? {
              borderRadius: 0,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.custom?.bgSecondary || theme.palette.grey[100],
            }
          : {
              aspectRatio: '1.618 / 1',
              minHeight: { xs: 170, md: 260 },
              borderRadius: '18px',
              border: `2px dashed ${theme.palette.divider}`,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))'
                  : 'linear-gradient(145deg, #fffaf0, #f8fafc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }),
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        '&:hover': {
          borderColor: theme.palette.orange?.main || theme.palette.primary.main,
        },
      }}
    >
      {previewUrl ? (
        <>
          <Box
            component="img"
            src={previewUrl}
            alt="Cover preview"
            sx={{
              width: '100%',
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
            }}
          />
          <Chip
            label="Change cover"
            size="small"
            sx={{ position: 'absolute', top: 12, right: 12, fontFamily: 'Quicksand, sans-serif' }}
          />
        </>
      ) : (
        <Stack alignItems="center" spacing={1} sx={{ px: 3, textAlign: 'center' }}>
          <CloudUploadIcon sx={{ fontSize: 42, color: theme.palette.text.secondary }} aria-hidden />
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
            Upload cover image
          </Typography>
        </Stack>
      )}
    </Box>
    {fileName && (
      <Chip label={fileName} size="small" sx={{ alignSelf: 'flex-start' }} onDelete={onClearFile} />
    )}
  </Stack>
);

export default BentoCoverImageField;
