import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Publish as PublishIcon, SaveOutlined as SaveOutlinedIcon } from '@mui/icons-material';
import { getCmsBookStatusLabel } from '../../../services/cmsBookAdminService';

const BooksBuilderCreateActions = ({
  bookStatus = 'draft',
  canPublish = false,
  canSaveDraft = false,
  isPublishing = false,
  isSavingDraft = false,
  isBusy = false,
  isInitializing = false,
  onPublish,
  onSaveDraft,
  onTest,
}) => {
  const theme = useTheme();
  const statusLabel = getCmsBookStatusLabel(bookStatus);
  const publishDisabled = !canPublish || isBusy || isInitializing;
  const draftDisabled = !canSaveDraft || isBusy || isInitializing;

  return (
    <Paper
      component="footer"
      role="region"
      aria-label="Book publish and draft actions"
      elevation={6}
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        mt: 3,
        p: { xs: 2, md: 2.5 },
        borderRadius: '16px',
        border: `1px solid ${theme.palette.border.main}`,
        backgroundColor: 'background.paper',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, color: 'text.primary' }}
          >
            Current status: {statusLabel}
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'Quicksand, sans-serif', color: 'text.secondary', mt: 0.5 }}
          >
            Use Save as draft while building. Publish when every page is complete (required for courses and the player).
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} useFlexGap flexWrap="wrap">
          <Button
            variant="outlined"
            onClick={onTest}
            disabled={isBusy || isInitializing}
            aria-label="Test book preview"
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Test
          </Button>
          <Button
            variant="outlined"
            startIcon={<SaveOutlinedIcon />}
            onClick={onSaveDraft}
            disabled={draftDisabled}
            aria-label="Save book as draft"
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            {isSavingDraft ? 'Saving draft...' : 'Save as draft'}
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<PublishIcon />}
            onClick={onPublish}
            disabled={publishDisabled}
            aria-label="Publish book"
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, minWidth: { sm: 140 } }}
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default BooksBuilderCreateActions;
