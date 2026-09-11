import React, { useState } from 'react';
import { Box, Switch, Typography, CircularProgress } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { KIDS_WALL_CONSENT_COPY } from '../../../constants/kidsWallConsent';
import KidsWallConsentModal from './KidsWallConsentModal';

/**
 * Per-child Kids Wall toggle. Off by default (RUK-SEC-006) — a parent must explicitly turn it
 * on, which requires reading the disclosure and checking the acknowledgment box in
 * KidsWallConsentModal. Turning it off needs no extra confirmation.
 */
const KidsWallConsentToggle = ({ child, consentLoading, onUpdateConsent }) => {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const enabled = child?.kidsWallEnabled === true && Boolean(child?.kidsWallConsentAt);

  const handleToggle = (event) => {
    if (event.target.checked) {
      setShowConsentModal(true);
      return;
    }
    onUpdateConsent(false);
  };

  const handleConfirmConsent = async () => {
    await onUpdateConsent(true);
    setShowConsentModal(false);
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

      <KidsWallConsentModal
        open={showConsentModal}
        childName={child?.displayName}
        loading={consentLoading}
        onConfirm={handleConfirmConsent}
        onCancel={() => setShowConsentModal(false)}
      />
    </Box>
  );
};

export default KidsWallConsentToggle;
