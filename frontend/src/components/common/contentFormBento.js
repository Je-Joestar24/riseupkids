/**
 * Shared bento layout tokens for admin content / live creation modals.
 */

export const COVER_ASPECT_RATIO = '6 / 4';

/** Max width of the cover drop zone (2× original 280px). */
export const COVER_DROPZONE_MAX_WIDTH = 560;

export const CONTENT_FORM_MODAL_MAX_WIDTH = 1100;

export const getContentFormPaperSx = (theme) => ({
  p: 2,
  borderRadius: '14px',
  height: '100%',
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
});

export const getContentFormFieldSx = () => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    fontFamily: 'Quicksand, sans-serif',
  },
});

export const getContentFormPrimaryButtonSx = (theme) => ({
  fontFamily: 'Quicksand, sans-serif',
  fontWeight: 600,
  textTransform: 'none',
  borderRadius: '10px',
  backgroundColor: theme.palette.orange?.main || theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.orange?.dark || theme.palette.primary.dark,
  },
});
