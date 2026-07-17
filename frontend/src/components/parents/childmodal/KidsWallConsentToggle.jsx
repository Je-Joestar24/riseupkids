import React from 'react';
import { Box, Switch, Typography, CircularProgress } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { KIDS_WALL_CONSENT_COPY } from '../../../constants/kidsWallConsent';

/**
 * Per-child Kids Wall toggle. Allowed by default; parents can block sharing.
 */
const KidsWallConsentToggle = ({ child, consentLoading, onUpdateConsent }) => {
  const enabled = child?.kidsWallEnabled !== false;

  const handleToggle = async (event) => {
    await onUpdateConsent(event.target.checked);
  };

  return (
    <Box
      sx={{
        borderTop: `1px solid ${themeColors.border}`,
        pt: 2,
        mt: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              color: themeColors.text,
            }}
          >
            {KIDS_WALL_CONSENT_COPY.toggleLabel}
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '0.875rem',
              color: themeColors.textSecondary,
              mt: 0.5,
            }}
          >
            {enabled ? KIDS_WALL_CONSENT_COPY.toggleHintOn : KIDS_WALL_CONSENT_COPY.toggleHintOff}
          </Typography>
          {enabled && child?.kidsWallConsentAt && (
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '0.75rem',
                color: themeColors.textSecondary,
                mt: 0.5,
              }}
            >
              Allowed since: {new Date(child.kidsWallConsentAt).toLocaleString()}
            </Typography>
          )}
        </Box>

        {consentLoading ? (
          <CircularProgress size={28} sx={{ color: themeColors.secondary }} />
        ) : (
          <Switch
            checked={enabled}
            onChange={handleToggle}
            inputProps={{
              'aria-label': `${KIDS_WALL_CONSENT_COPY.toggleLabel} for ${child?.displayName || 'child'}`,
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default KidsWallConsentToggle;
