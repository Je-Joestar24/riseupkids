import React from 'react';
import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const ModuleStatusChip = ({ isPublished, size = 'small' }) => {
  const theme = useTheme();
  const published = Boolean(isPublished);

  return (
    <Chip
      label={published ? 'Published' : 'Draft'}
      size={size}
      aria-label={published ? 'Module is published' : 'Module is draft'}
      sx={{
        fontFamily: 'Quicksand, sans-serif',
        fontWeight: 700,
        fontSize: size === 'small' ? '0.7rem' : '0.75rem',
        height: size === 'small' ? 24 : 28,
        backgroundColor: published
          ? `${theme.palette.success.main}22`
          : `${theme.palette.warning.main}22`,
        color: published ? theme.palette.success.dark : theme.palette.warning.dark,
        border: `1px solid ${published ? theme.palette.success.main : theme.palette.warning.main}55`,
      }}
    />
  );
};

export default ModuleStatusChip;
