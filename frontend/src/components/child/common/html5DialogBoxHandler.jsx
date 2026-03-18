import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

export const ConfirmCloseDialog = ({ open, onConfirm, onCancel, title, isCompleted }) => (
  <Dialog
    open={open}
    onClose={onCancel}
    maxWidth="sm"
    fullWidth
    PaperProps={{
      sx: {
        borderRadius: '20px',
        fontFamily: 'Quicksand, sans-serif',
        backgroundColor: themeColors.bgCard,
        padding: '8px',
      },
    }}
  >
    <DialogTitle
      sx={{
        fontFamily: 'Quicksand, sans-serif',
        fontWeight: 700,
        fontSize: '2rem',
        color: themeColors.primary,
        textAlign: 'center',
        padding: '24px',
      }}
    >
      {title || 'Close activity?'}
    </DialogTitle>
    <DialogContent sx={{ padding: '0 24px' }}>
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '1.5rem',
          color: themeColors.text,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        {isCompleted
          ? 'Great job! Your progress has been saved. Do you want to close this book?'
          : 'Do you want to close this book? Your progress will be saved!'}
      </Typography>
    </DialogContent>
    <DialogActions sx={{ padding: '24px', justifyContent: 'center', gap: 2 }}>
      <Button
        onClick={onCancel}
        variant="outlined"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
          fontSize: '1.3rem',
          textTransform: 'none',
          padding: '12px 32px',
          borderRadius: '12px',
          color: themeColors.orange,
          '&:hover': { borderWidth: '3px', backgroundColor: themeColors.bgTertiary },
        }}
      >
        Keep Reading
      </Button>
      <Button
        onClick={onConfirm}
        variant="contained"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
          fontSize: '1.3rem',
          textTransform: 'none',
          padding: '12px 32px',
          borderRadius: '12px',
          backgroundColor: themeColors.secondary,
          color: themeColors.textInverse,
          '&:hover': { backgroundColor: themeColors.primary },
        }}
      >
        Yes, Close
      </Button>
    </DialogActions>
  </Dialog>
);

export const TryAgainDialog = ({ open, onTryAgain, onContinue }) => (
  <Dialog
    open={open}
    onClose={() => {}}
    maxWidth="xs"
    fullWidth
    PaperProps={{
      sx: {
        borderRadius: '24px',
        fontFamily: 'Quicksand, sans-serif',
        backgroundColor: themeColors.bgCard,
        padding: '8px',
        textAlign: 'center',
      },
    }}
  >
    <DialogContent sx={{ pt: 4, pb: 2, px: 3 }}>
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '1.5rem',
          color: themeColors.text,
          lineHeight: 1.5,
        }}
      >
        Not quite yet!
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
          fontSize: '1.15rem',
          color: themeColors.textSecondary,
          mt: 1.5,
          lineHeight: 1.5,
        }}
      >
        You can try again or continue reading.
      </Typography>
    </DialogContent>
    <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3, gap: 2 }}>
      <Button
        onClick={onTryAgain}
        variant="contained"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '1.2rem',
          textTransform: 'none',
          padding: '14px 28px',
          borderRadius: '16px',
          backgroundColor: themeColors.orange,
          color: themeColors.textInverse,
          '&:hover': { backgroundColor: themeColors.primary },
        }}
      >
        Try again
      </Button>
      <Button
        onClick={onContinue}
        variant="outlined"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '1.2rem',
          textTransform: 'none',
          padding: '14px 28px',
          borderRadius: '16px',
          borderColor: themeColors.secondary,
          color: themeColors.secondary,
          '&:hover': { backgroundColor: themeColors.bgTertiary, borderWidth: '2px' },
        }}
      >
        Continue
      </Button>
    </DialogActions>
  </Dialog>
);

export default { ConfirmCloseDialog, TryAgainDialog };
