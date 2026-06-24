import React from 'react';
import {
  Box,
  Chip,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, InsertLink as InsertLinkIcon } from '@mui/icons-material';
import { looksLikeBunnyExploreEmbedUrl } from '../../../../utils/bunnyExploreEmbed';

const BentoInstructionVideoField = ({
  theme,
  idPrefix,
  videoSource,
  embedUrl,
  onSourceChange,
  onEmbedUrlChange,
  selectedFile,
  filePreviewUrl,
  onFileSelect,
  onClearFile,
  currentEmbedUrl = '',
  currentUploadUrl = '',
}) => {
  const uploadInputId = `${idPrefix}-instruction-video-upload`;
  const showEmbedPreview = videoSource === 'embed' && looksLikeBunnyExploreEmbedUrl(embedUrl || currentEmbedUrl);
  const embedPreviewSrc = (embedUrl || currentEmbedUrl || '').trim();
  const showUploadPreview = videoSource === 'upload' && (filePreviewUrl || currentUploadUrl);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, mb: 0.5 }}>
          Instruction video
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
          Optional guide video — upload a file or paste a Bunny iframe link.
        </Typography>
      </Box>

      <FormControl component="fieldset" fullWidth>
        <RadioGroup
          row
          value={videoSource}
          onChange={(e) => onSourceChange(e.target.value)}
          aria-label="How to add the instruction video"
        >
          <FormControlLabel
            value="upload"
            control={<Radio />}
            label={(
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <CloudUploadIcon fontSize="small" aria-hidden />
                <span>Upload file</span>
              </Stack>
            )}
          />
          <FormControlLabel
            value="embed"
            control={<Radio />}
            label={(
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <InsertLinkIcon fontSize="small" aria-hidden />
                <span>Bunny embed</span>
              </Stack>
            )}
          />
        </RadioGroup>
      </FormControl>

      {videoSource === 'upload' ? (
        <Box>
          <input
            accept="video/*"
            style={{ display: 'none' }}
            id={uploadInputId}
            type="file"
            aria-label="Select instruction video file"
            onChange={onFileSelect}
          />
          <Box
            component="label"
            htmlFor={uploadInputId}
            role="button"
            tabIndex={0}
            aria-label={selectedFile ? 'Change instruction video file' : 'Upload instruction video file'}
            sx={{
              width: '100%',
              aspectRatio: '1.618 / 1',
              minHeight: { xs: 200, md: 300 },
              borderRadius: showUploadPreview ? 0 : '18px',
              border: showUploadPreview || selectedFile
                ? `1px solid ${theme.palette.divider}`
                : `2px dashed ${theme.palette.divider}`,
              overflow: 'hidden',
              background: showUploadPreview ? '#000' : (
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))'
                  : 'linear-gradient(145deg, #fffaf0, #f8fafc)'
              ),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              '&:hover': {
                borderColor: theme.palette.orange?.main || theme.palette.primary.main,
              },
            }}
          >
            {showUploadPreview ? (
              <>
                <Box
                  component="video"
                  src={filePreviewUrl || currentUploadUrl}
                  controls
                  playsInline
                  sx={{ width: '100%', height: '100%', objectFit: 'contain', bgcolor: '#000' }}
                />
                <Chip
                  label="Change video"
                  size="small"
                  sx={{ position: 'absolute', top: 12, right: 12, fontFamily: 'Quicksand, sans-serif' }}
                />
              </>
            ) : (
              <Stack alignItems="center" spacing={1.25} sx={{ px: 3, textAlign: 'center' }}>
                <CloudUploadIcon sx={{ fontSize: 48, color: theme.palette.text.secondary }} aria-hidden />
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                  Upload instruction video
                </Typography>
              </Stack>
            )}
          </Box>
          {selectedFile && (
            <Chip
              label={selectedFile.name}
              size="small"
              sx={{ mt: 1 }}
              onDelete={onClearFile}
            />
          )}
        </Box>
      ) : (
        <Box>
          <TextField
            value={embedUrl}
            onChange={(e) => onEmbedUrlChange(e.target.value)}
            placeholder="https://iframe.mediadelivery.net/embed/..."
            fullWidth
            multiline
            minRows={2}
            inputProps={{ 'aria-label': 'Bunny Stream iframe embed URL for instruction video' }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              },
            }}
          />
          <Box
            sx={{
              mt: 1.5,
              width: '100%',
              aspectRatio: '1.618 / 1',
              minHeight: { xs: 200, md: 300 },
              borderRadius: '18px',
              border: `1px solid ${theme.palette.divider}`,
              overflow: 'hidden',
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            role="region"
            aria-label="Bunny instruction video embed preview"
          >
            {showEmbedPreview ? (
              <Box
                component="iframe"
                title="Bunny instruction video preview"
                src={embedPreviewSrc}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
                sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
              />
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 2, textAlign: 'center', fontFamily: 'Quicksand, sans-serif' }}
              >
                Enter a valid Bunny embed URL to preview the player.
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Stack>
  );
};

export default BentoInstructionVideoField;
