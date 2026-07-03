import React from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import StarIcon from '@mui/icons-material/Star';
import { themeColors } from '../../../../config/themeColors';
import { CMS_INTERACTIVE_RESULT_COPY } from './cmsInteractiveFeedbackConstants';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const popIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.82); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-6px) scale(1); }
`;

/**
 * Child-friendly success / retry popup for CMS drag activities (web parity with app toast).
 */
const CmsInteractiveResultToast = ({
  visible = false,
  tone = 'success',
  onDismiss,
}) => {
  if (!visible) return null;

  const copy = CMS_INTERACTIVE_RESULT_COPY[tone] || CMS_INTERACTIVE_RESULT_COPY.success;
  const isSuccess = tone === 'success';
  const accent = isSuccess ? themeColors.secondary : themeColors.orange;

  const content = (
    <>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.22)',
          animation: `${fadeIn} 240ms ease-out`,
        }}
      />

      <Box
        sx={{
          position: 'relative',
          width: 'min(100%, 360px)',
          animation: `${popIn} 280ms cubic-bezier(0.22, 1, 0.36, 1), ${float} 1.04s ease-in-out 280ms infinite`,
        }}
      >
        <Box
          sx={{
            borderRadius: '28px',
            py: 2.75,
            px: 2.5,
            textAlign: 'center',
            backgroundColor: '#ffffff',
            border: `3px solid ${accent}`,
            boxShadow: '0 6px 16px rgba(15, 23, 42, 0.12)',
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: 12,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 1.25,
            }}
          >
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: i === 1 ? 10 : 8,
                  height: i === 1 ? 10 : 8,
                  borderRadius: '50%',
                  backgroundColor: i === 1 ? themeColors.accent : accent,
                  opacity: 0.85,
                  mt: i === 1 ? '-4px' : 0,
                }}
              />
            ))}
          </Box>

          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: `3px solid ${accent}`,
              backgroundColor: `${accent}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 1.25,
              fontSize: '2.4rem',
              lineHeight: 1,
            }}
            aria-hidden
          >
            {copy.emoji}
          </Box>

          <Typography
            component="h2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 800,
              fontSize: { xs: '1.75rem', md: '1.875rem' },
              lineHeight: 1.2,
              color: accent,
              mb: 0.75,
            }}
          >
            {copy.title}
          </Typography>

          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              fontSize: '1rem',
              lineHeight: 1.4,
              color: themeColors.textSecondary,
              maxWidth: 280,
              mx: 'auto',
            }}
          >
            {copy.message}
          </Typography>

          {isSuccess ? (
            <Box
              aria-hidden
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mt: 1.75,
              }}
            >
              <StarIcon sx={{ color: themeColors.accent, fontSize: 22 }} />
              <StarIcon sx={{ color: themeColors.secondary, fontSize: 28 }} />
              <StarIcon sx={{ color: themeColors.accent, fontSize: 22 }} />
            </Box>
          ) : null}
        </Box>
      </Box>
    </>
  );

  if (onDismiss) {
    return (
      <Box
        role="button"
        tabIndex={0}
        onClick={onDismiss}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onDismiss();
          }
        }}
        aria-label="Tap background to try again"
        aria-live="polite"
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2.5,
          cursor: 'pointer',
        }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Box
      role="alert"
      aria-live="polite"
      aria-label={`${copy.title} ${copy.message}`}
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2.5,
        pointerEvents: 'none',
      }}
    >
      {content}
    </Box>
  );
};

export default CmsInteractiveResultToast;
