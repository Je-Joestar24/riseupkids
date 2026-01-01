import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Stack, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add as AddIcon } from '@mui/icons-material';
import AdminUsersTable from '../../components/admin/users/AdminUsersTable';
import AdminUsersFilters from '../../components/admin/users/AdminUsersFilters';
import AdminUsersPagination from '../../components/admin/users/AdminUsersPagination';
import AdminAddUserModal from '../../components/admin/users/AdminAddUserModal';
import useParents from '../../hooks/parentsHook';

/**
 * AdminUsers Page
 * 
 * Main page for managing parent users
 */
const AdminUsers = () => {
  const theme = useTheme();
  const { fetchParents, loading } = useParents();
  const [addModalOpen, setAddModalOpen] = useState(false);

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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                User Page
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: theme.palette.text.secondary,
                  fontSize: '0.9375rem',
                  marginTop: 1,
                }}
              >
                Manage user accounts, view parent information, and handle account status
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddModalOpen(true)}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                fontSize: '0.875rem',
                padding: '10px 24px',
                borderRadius: '8px',
                textTransform: 'none',
                backgroundColor: theme.palette.orange.main,
                color: theme.palette.textCustom.inverse,
                '&:hover': {
                  backgroundColor: theme.palette.orange.dark,
                },
              }}
            >
              Add Parent
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Filters */}
      <AdminUsersFilters />

      {/* Table */}
      <AdminUsersTable />

      {/* Pagination */}
      <AdminUsersPagination />

      {/* Add User Modal */}
      <AdminAddUserModal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          // Refresh the list after adding
          fetchParents();
        }}
      />
    </Box>
  );
};

export default AdminUsers;

