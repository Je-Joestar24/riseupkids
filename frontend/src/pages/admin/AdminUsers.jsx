import React, { useEffect } from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AdminUsersTable from '../../components/admin/users/AdminUsersTable';
import AdminUsersFilters from '../../components/admin/users/AdminUsersFilters';
import AdminUsersPagination from '../../components/admin/users/AdminUsersPagination';
import useParents from '../../hooks/parentsHook';

/**
 * AdminUsers Page
 * 
 * Main page for managing parent users
 */
const AdminUsers = () => {
  const theme = useTheme();
  const { fetchParents, loading } = useParents();

  // Fetch parents on component mount
  useEffect(() => {
    fetchParents();
  }, []);

  return (
    <Box>
      {/* Header Section */}
      <Paper
        sx={{
          padding: 3.5,
          marginBottom: 4,
          marginTop: 2,
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
              color: theme.palette.text.primary,
            }}
          >
            User Page
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
              fontSize: '0.9375rem',
            }}
          >
            Manage user accounts, view parent information, and handle account status
          </Typography>
        </Stack>
      </Paper>

      {/* Filters */}
      <AdminUsersFilters />

      {/* Table */}
      <AdminUsersTable />

      {/* Pagination */}
      <AdminUsersPagination />
    </Box>
  );
};

export default AdminUsers;

