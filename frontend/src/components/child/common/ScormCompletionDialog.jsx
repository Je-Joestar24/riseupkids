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
 * ScormCompletionDialog Component
 * 
 * Displays a celebratory dialog when a SCORM book is completed.
 * Shows stars awarded, reading count, and total stars.
 * 
 * @param {Boolean} open - Dialog open state
 * @param {Function} onClose - Close handler
 * @param {Object} data - Completion data
 * @param {Boolean} data.starsAwarded - Whether stars were awarded
 * @param {Number} data.starsToAward - Number of stars awarded
 * @param {Number} data.totalStars - Total stars the child has
 */
const ScormCompletionDialog = ({ open, onClose, data }) => {
  const { 
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
      disableEscapeKeyDown={true}
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
        onClick: (e) => {
          e.stopPropagation();
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '2.5rem',
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
            fontSize: '1.5rem',
            color: themeColors.text,
            marginBottom: 2,
            lineHeight: 1.6,
          }}
        >
          You finished reading the book!
        </Typography>
        
        {/* Reading Progress Display */}
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
              fontSize: '1.2rem',
              fontWeight: 600,
              color: themeColors.text,
              textAlign: 'center',
            }}
          >
            Reading Progress: {readingCount} / {requiredReadingCount}
          </Typography>
          {!requirementMet && (
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '1rem',
                color: themeColors.textSecondary,
                textAlign: 'center',
                mt: 1,
              }}
            >
              Read {requiredReadingCount - readingCount} more time{requiredReadingCount - readingCount !== 1 ? 's' : ''} to earn stars!
            </Typography>
          )}
        </Box>
        
        {starsAwarded && starsToAward > 0 && (
          <Box
            sx={{
              my: 3,
              p: 3,
              bgcolor: themeColors.warning + '20',
              borderRadius: '16px',
              border: `3px solid ${themeColors.warning}`,
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '1.3rem',
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
                  fontSize: '2.5rem',
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
                  fontSize: '1.1rem',
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
            mt: 3,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.3rem',
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

export default ScormCompletionDialog;
