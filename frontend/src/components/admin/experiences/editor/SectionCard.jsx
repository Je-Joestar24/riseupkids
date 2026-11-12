import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * One titled block of the editor (Details, Videos, Status, Cover picture, Printable): the same card as the
 * rest of the admin, with an optional note under the title and an optional small element on the right.
 */
const SectionCard = ({ title, note, action = null, children, ...rest }) => {
  const theme = useTheme();
  return (
    <Paper
      component="section"
      aria-label={title}
      sx={{ p: { xs: 2, md: 2.5 }, borderRadius: '14px', border: `1px solid ${theme.palette.border.main}`, boxShadow: theme.shadows[1] }}
      {...rest}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" component="h2" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: '1.05rem' }}>
            {title}
          </Typography>
          {note && (
            <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary, mt: 0.25 }}>
              {note}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      {children}
    </Paper>
  );
};

export default SectionCard;
