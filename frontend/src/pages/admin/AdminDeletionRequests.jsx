import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AdminDeletionRequestsTable from '../../components/admin/deletion/AdminDeletionRequestsTable';

const AdminDeletionRequests = () => {
  const theme = useTheme();

  return (
    <Box>
      <Paper
        sx={{
          p: 3.5,
          mb: 4,
          mt: 2,
          borderRadius: '16px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
          boxShadow: theme.shadows[2],
        }}
      >
        <Stack spacing={1}>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: '1.75rem',
            }}
          >
            Deletion Requests
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
            }}
          >
            Review self-service account and child profile deletion requests. Due requests are
            processed automatically by the server scheduler after the retention period.
          </Typography>
        </Stack>
      </Paper>

      <AdminDeletionRequestsTable />
    </Box>
  );
};

export default AdminDeletionRequests;
