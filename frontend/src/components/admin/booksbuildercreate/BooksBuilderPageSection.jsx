import React from 'react';
import { Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import BooksBuilderTypeDropArea from './BooksBuilderTypeDropArea';
import BooksBuilderPageFields from './BooksBuilderPageFields';

const BooksBuilderPageSection = ({ page, pageIndex, onOpenTypeMenu, onPatchPage }) => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: { xs: 2, md: 3 },
        mb: 2,
        borderRadius: '16px',
        border: `1px solid ${theme.palette.border.main}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
      }}
    >
      <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Page {pageIndex + 1}</Typography>

      <BooksBuilderTypeDropArea
        page={page}
        pageIndex={pageIndex}
        onOpenTypeMenu={(targetEl) => onOpenTypeMenu(targetEl, pageIndex)}
        onPatch={(patch) => onPatchPage(pageIndex, patch)}
      />

      <BooksBuilderPageFields page={page} onPatch={(patch) => onPatchPage(pageIndex, patch)} />
    </Paper>
  );
};

export default BooksBuilderPageSection;
