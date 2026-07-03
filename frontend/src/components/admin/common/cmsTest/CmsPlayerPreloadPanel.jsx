import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { pageFrameSx } from './shared';
import CmsPlayerLoadingSpinner from './CmsPlayerLoadingSpinner';

const CmsPlayerPreloadPanel = ({
  preloadProgress = 0,
  preloadSummary = null,
  title = 'Loading all content...',
  subtitle = 'Preparing media for smooth playback. Please wait.',
}) => {
  const percent = Math.max(0, Math.min(100, Number(preloadProgress) || 0));

  return (
    <Box
      sx={{
        ...pageFrameSx,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #fffaf2 0%, #fff3e6 100%)',
      }}
    >
      <Box
        role="status"
        aria-label="Loading all media assets for smooth playback"
        sx={{
          width: 'min(86%, 640px)',
          p: { xs: 3, md: 4 },
          borderRadius: '16px',
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: (theme) => `1px solid ${theme.palette.border.main}`,
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          textAlign: 'center',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <CmsPlayerLoadingSpinner size={48} accessibilityLabel="Preloading book media" />
        </Box>

        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 800, color: '#141414', mb: 1 }}>
          {title}
        </Typography>
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, color: '#414141', mb: 2 }}>
          {subtitle}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={percent}
          aria-label="Media preload progress"
          sx={{ height: 10, borderRadius: '999px', mb: 1.4 }}
        />
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, color: '#141414' }}>
          {percent}% loaded
        </Typography>
        {preloadSummary?.failed?.length ? (
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '0.84rem', color: '#7a4b00', mt: 1 }}>
            Some files could not be preloaded, but playback will still continue.
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
};

export default CmsPlayerPreloadPanel;
