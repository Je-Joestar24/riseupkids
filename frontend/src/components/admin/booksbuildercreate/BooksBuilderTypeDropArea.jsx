import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AddCircleOutline } from '@mui/icons-material';
import { PAGE_TYPES } from './BooksBuilderCreate.constants';

const BooksBuilderTypeDropArea = ({ page, pageIndex, onOpenTypeMenu }) => {
  const theme = useTheme();
  const selectedLabel = PAGE_TYPES.find((item) => item.key === page.type)?.label || null;

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={`Add content type for page ${pageIndex + 1}`}
      onClick={(event) => onOpenTypeMenu(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenTypeMenu(event.currentTarget);
        }
      }}
      sx={{
        width: '100%',
        minHeight: 'calc(100vh - 60px)',
        borderRadius: '22px',
        border: `2px dashed ${theme.palette.orange.main}`,
        backgroundColor: `${theme.palette.orange.main}12`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        alignSelf: 'center',
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 4 },
        textAlign: 'center',
        '&:hover': {
          backgroundColor: `${theme.palette.orange.main}1c`,
        },
      }}
    >
      <AddCircleOutline sx={{ color: 'orange.main', fontSize: 42 }} />
      <Typography
        sx={{
          mt: 1.2,
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 800,
          fontSize: selectedLabel ? { xs: '1.15rem', md: '1.35rem' } : '1rem',
          color: selectedLabel ? 'orange.dark' : 'text.primary',
        }}
      >
        {selectedLabel || 'Add Content'}
      </Typography>
      <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', color: 'text.secondary' }}>
        Click to choose page type
      </Typography>
    </Box>
  );
};

export default BooksBuilderTypeDropArea;
