import React from 'react';
import { Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * The bar that stays in view at the bottom of the editor: how things stand, Cancel and Save. Editing an
 * experience that has not been changed has nothing to save, so Save waits until something is.
 */
const ExperienceSaveBar = ({ isEdit, dirty, saving, onCancel, onSave }) => {
  const theme = useTheme();
  const status = saving ? 'Saving…' : dirty ? 'You have unsaved changes' : isEdit ? 'No changes yet' : '';
  const label = isEdit ? 'Save changes' : 'Create experience';
  return (
    <Paper
      component="div"
      role="region"
      aria-label="Save the experience"
      sx={{
        position: 'sticky',
        bottom: 16,
        zIndex: 5,
        mt: 2,
        px: { xs: 1.5, sm: 2.5 },
        py: 1.5,
        borderRadius: '14px',
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[4],
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Typography role="status" variant="body2" noWrap sx={{ minWidth: 0, fontFamily: 'Quicksand, sans-serif', color: dirty ? theme.palette.orange.main : theme.palette.text.secondary, fontWeight: 700 }}>
          {status}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button onClick={onCancel} disabled={saving} sx={{ whiteSpace: 'nowrap', textTransform: 'none', borderRadius: '10px', fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={saving || (isEdit && !dirty)}
            startIcon={saving ? <CircularProgress size={16} color="inherit" aria-hidden /> : null}
            sx={{ whiteSpace: 'nowrap', textTransform: 'none', borderRadius: '10px', fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}
          >
            {saving ? 'Saving…' : label}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default ExperienceSaveBar;
