import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Button,
  Box,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { themeColors } from '../../../config/themeColors';

/**
 * CmsCompletionDialog Component
 *
 * Completion dialog for child CMS book player.
 * Mirrors SCORM completion UI while also showing CMS session metrics.
 *
 * @param {boolean} open
 * @param {Function} onClose
 * @param {Object} data
 * @param {number} data.score
 * @param {number} data.maxScore
 * @param {number} data.attemptCount
 * @param {boolean} data.starsAwarded
 * @param {number} data.starsToAward
 * @param {number} data.totalStars
 * @param {number} data.readingCount
 * @param {number} data.requiredReadingCount
 * @param {boolean} data.requirementMet
 */
const CmsCompletionDialog = ({ open, onClose, data }) => {
  const {
    score = 0,
    maxScore = 0,
    attemptCount = 0,
    starsAwarded,
    starsToAward = 0,
    totalStars,
    readingCount = 0,
    requiredReadingCount = 5,
    requirementMet = false,
  } = data || {};

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: '20px',
          fontFamily: 'Quicksand, sans-serif',
          backgroundColor: themeColors.bgCard,
          padding: '8px',
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        },
        onClick: (event) => {
          event.stopPropagation();
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '2.2rem',
          color: themeColors.success,
          textAlign: 'center',
          padding: '32px 24px 16px',
        }}
      >
        🎉 Great Job! 🎉
      </DialogTitle>

      <DialogContent
        sx={{
          padding: '0 24px 24px',
          textAlign: 'center',
        }}
      >
        <CheckCircleIcon
          sx={{
            fontSize: 80,
            color: themeColors.success,
            mb: 2,
          }}
        />

        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '1.4rem',
            color: themeColors.text,
            marginBottom: 2,
            lineHeight: 1.6,
          }}
        >
          You finished the CMS book!
        </Typography>

        <Box
          sx={{
            my: 2,
            p: 2,
            bgcolor: themeColors.bgTertiary,
            borderRadius: '12px',
            border: `2px solid ${themeColors.secondary}`,
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: themeColors.text,
            }}
          >
            Score: {score} / {maxScore}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '1rem',
              color: themeColors.textSecondary,
              mt: 0.8,
            }}
          >
            Attempts: {attemptCount}
          </Typography>
        </Box>

        <Box
          sx={{
            my: 2,
            p: 2,
            bgcolor: themeColors.bgTertiary,
            borderRadius: '12px',
            border: `2px solid ${themeColors.secondary}`,
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: themeColors.text,
            }}
          >
            Reading Progress: {readingCount} / {requiredReadingCount}
          </Typography>
          {!requirementMet && (
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '0.98rem',
                color: themeColors.textSecondary,
                mt: 1,
              }}
            >
              Read {Math.max(requiredReadingCount - readingCount, 0)} more time
              {Math.max(requiredReadingCount - readingCount, 0) !== 1 ? 's' : ''} to earn stars!
            </Typography>
          )}
        </Box>

        {starsAwarded && starsToAward > 0 && (
          <Box
            sx={{
              my: 3,
              p: 3,
              bgcolor: `${themeColors.warning}20`,
              borderRadius: '16px',
              border: `3px solid ${themeColors.warning}`,
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '1.2rem',
                fontWeight: 600,
                color: themeColors.text,
                marginBottom: 1,
              }}
            >
              Stars Earned:
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                marginBottom: 1,
              }}
            >
              <StarIcon
                sx={{
                  color: themeColors.warning,
                  fontSize: 40,
                }}
              />
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: themeColors.warning,
                  fontWeight: 700,
                  fontSize: '2.4rem',
                }}
              >
                +{starsToAward}
              </Typography>
            </Box>

            {totalStars !== undefined && (
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: '1.05rem',
                  color: themeColors.textSecondary,
                  fontWeight: 600,
                }}
              >
                Total Stars: {totalStars}
              </Typography>
            )}
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={onClose}
          sx={{
            mt: 2.5,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.2rem',
            textTransform: 'none',
            padding: '12px 48px',
            borderRadius: '12px',
            backgroundColor: themeColors.secondary,
            color: themeColors.textInverse,
            border: `3px solid ${themeColors.primary}`,
            '&:hover': {
              backgroundColor: themeColors.primary,
              transform: 'scale(1.05)',
            },
          }}
        >
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CmsCompletionDialog;
