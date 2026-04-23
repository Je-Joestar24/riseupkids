import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AutoStoriesOutlined as AutoStoriesOutlinedIcon, AddCircleOutline as AddCircleOutlineIcon } from '@mui/icons-material';

const BooksBuilderHeader = ({ totalBooks = 0, onBuild }) => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 3,
        mb: 2,
        borderRadius: '16px',
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[2],
      }}
    >
      <Stack spacing={1.5}>
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <AutoStoriesOutlinedIcon sx={{ color: theme.palette.orange.main }} />
            <Typography
              variant="h4"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: { xs: '1.35rem', md: '1.75rem' },
              }}
            >
              Built-in Books
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            onClick={onBuild}
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              borderColor: theme.palette.border.orange,
              color: theme.palette.orange.dark,
              '&:hover': {
                borderColor: theme.palette.orange.main,
                backgroundColor: `${theme.palette.orange.main}14`,
              },
            }}
          >
            Build Book ({Number(totalBooks || 0)})
          </Button>
        </Box>

        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
          }}
        >
          Manage built-in books in a dedicated list view. Books are treated as auto-published content.
        </Typography>
      </Stack>
    </Paper>
  );
};

export default BooksBuilderHeader;
