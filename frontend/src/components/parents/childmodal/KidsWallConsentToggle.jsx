import React, { useState } from 'react';
import { Box, Switch, Typography, CircularProgress } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { KIDS_WALL_CONSENT_COPY } from '../../../constants/kidsWallConsent';
import KidsWallConsentModal from './KidsWallConsentModal';

/**
 * Per-child Kids Wall toggle with consent modal when enabling.
 */
const KidsWallConsentToggle = ({ child, consentLoading, onUpdateConsent }) => {
  const [consentOpen, setConsentOpen] = useState(false);
  const enabled = child?.kidsWallEnabled === true;

  const handleToggle = async (event) => {
    const nextEnabled = event.target.checked;

    if (nextEnabled) {
      setConsentOpen(true);
      return;
    }

    await onUpdateConsent(false);
  };

  const handleConfirmEnable = async () => {
    await onUpdateConsent(true);
    setConsentOpen(false);
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
              Consent recorded: {new Date(child.kidsWallConsentAt).toLocaleString()}
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

      <KidsWallConsentModal
        open={consentOpen}
        childName={child?.displayName || child?.name}
        loading={consentLoading}
        onConfirm={handleConfirmEnable}
        onCancel={() => setConsentOpen(false)}
      />
    </Box>
  );
};

export default KidsWallConsentToggle;
