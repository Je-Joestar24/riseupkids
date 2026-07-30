import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LockOpenOutlined from '@mui/icons-material/LockOpenOutlined';

const ModuleAccessHeader = () => {
  const theme = useTheme();

  return (
    <Box sx={{ marginBottom: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <LockOpenOutlined sx={{ color: theme.palette.orange.main, fontSize: 28 }} />
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: '1.75rem',
              color: theme.palette.text.primary,
            }}
          >
            Module Access
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
              fontSize: '0.9375rem',
              marginTop: 0.5,
            }}
          >
            Lock or unlock journey modules for a specific child
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default ModuleAccessHeader;
