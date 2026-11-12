import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AddCircleOutline as AddIcon, TravelExploreOutlined as ExperiencesIcon } from '@mui/icons-material';

/**
 * Title of the Experiences page, how many there are, and the "Add experience" button.
 */
const ExperiencesHeader = ({ total = 0, loaded = false, onAdd }) => {
  const theme = useTheme();
  const count = Number(total) || 0;

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
            <ExperiencesIcon sx={{ color: theme.palette.orange.main }} aria-hidden />
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: { xs: '1.35rem', md: '1.75rem' } }}
            >
              Experiences
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAdd}
            sx={{ textTransform: 'none', borderRadius: '12px', fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}
          >
            Add experience
          </Button>
        </Box>

        <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
          The experiences children see under Explore. Each one has a title, a description and a list of videos. Only published
          experiences are visible to children.
        </Typography>

        {loaded && (
          <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary, fontSize: '0.875rem' }}>
            Total: {count} {count === 1 ? 'experience' : 'experiences'}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default ExperiencesHeader;
