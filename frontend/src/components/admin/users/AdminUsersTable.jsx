import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
  Typography,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import useParents from '../../../hooks/parentsHook';
import { getAdminUserRoleLabel, isParentRole } from '../../../utils/adminUserRoles';
import { getAdminAccountDisplayStatus } from '../../../utils/accountDisplayStatus';
import { useDispatch } from 'react-redux';
import { showConfirmationDialog } from '../../../store/slices/uiSlice';
import AdminViewModal from './AdminViewModal';
import AdminEditUserModal from './AdminEditUserModal';

/**
 * AdminUsersTable Component
 * 
 * Displays table of parent users with archive/restore functionality
 */
const AdminUsersTable = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const {
    parents,
    loading,
    filters,
    archiveParentData,
    restoreParentData,
    fetchParents,
  } = useParents();

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [selectedUserRole, setSelectedUserRole] = useState(null);

  const showParentColumns = isParentRole(filters.role);

  const handleArchive = (user) => {
    const role = user.role || filters.role;
    dispatch(
      showConfirmationDialog({
        title: 'Archive User',
        message: `Are you sure you want to archive ${user.name}?`,
        onConfirm: async () => {
          try {
            await archiveParentData(user._id, role);
            fetchParents(filters);
          } catch (_error) {
            // handled in hook
          }
        },
      })
    );
  };

  const handleRestore = (user) => {
    const role = user.role || filters.role;
    dispatch(
      showConfirmationDialog({
        title: 'Restore User',
        message: `Are you sure you want to restore ${user.name}?`,
        onConfirm: async () => {
          try {
            await restoreParentData(user._id, role);
            fetchParents(filters);
          } catch (_error) {
            // handled in hook
          }
        },
      })
    );
  };

  if (loading && parents.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
        }}
      >
        <CircularProgress sx={{ color: theme.palette.primary.main }} />
      </Box>
    );
  }

  if (parents.length === 0) {
    return (
      <Paper
        sx={{
          padding: 4,
          textAlign: 'center',
          borderRadius: '12px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
          boxShadow: theme.shadows[2],
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
          }}
        >
          No users found
        </Typography>
      </Paper>
    );
  }

  return (
    <>
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: '12px',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[2],
        overflow: 'hidden',
      }}
    >
      <Table>
        <TableHead>
          <TableRow
            sx={{
              backgroundColor: theme.palette.custom.bgSecondary,
              '& th': {
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: '0.875rem',
                color: theme.palette.text.primary,
                borderBottom: `2px solid ${theme.palette.border.main}`,
                padding: 2,
              },
            }}
          >
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            {showParentColumns && <TableCell>Children</TableCell>}
            <TableCell>Status</TableCell>
            {showParentColumns && <TableCell>Subscription</TableCell>}
            <TableCell>Last Login</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {parents.map((user) => {
            const accountStatus = getAdminAccountDisplayStatus(user);

            return (
            <TableRow key={user._id}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {user.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  {user.email}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={getAdminUserRoleLabel(user.role || filters.role)}
                  size="small"
                />
              </TableCell>
              {showParentColumns && (
                <TableCell>
                  <Chip label={`${user.childProfilesCount || 0} active`} size="small" />
                </TableCell>
              )}
              <TableCell>
                <Chip
                  label={accountStatus.label}
                  size="small"
                  color={accountStatus.muiColor}
                />
              </TableCell>
              {showParentColumns && (
                <TableCell>
                  <Chip
                    label={user.subscriptionStatus || 'inactive'}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
              )}
              <TableCell>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleDateString()
                    : 'Never'}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  {accountStatus.canArchive && (
                    <Tooltip title="Archive">
                      <IconButton size="small" onClick={() => handleArchive(user)} aria-label="Archive user">
                        <ArchiveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {accountStatus.canRestore && (
                    <Tooltip title="Restore">
                      <IconButton size="small" onClick={() => handleRestore(user)} aria-label="Restore user">
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {accountStatus.deletionRequest &&
                    (accountStatus.deletionRequest.status === 'pending' ||
                      accountStatus.deletionRequest.status === 'processing') && (
                    <Tooltip
                      title={
                        accountStatus.deletionRequest.scheduledPurgeAt
                          ? `Scheduled purge: ${new Date(accountStatus.deletionRequest.scheduledPurgeAt).toLocaleDateString()}`
                          : 'Self-service deletion in progress'
                      }
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: theme.palette.warning.main, alignSelf: 'center', px: 0.5 }}
                      >
                        Pending purge
                      </Typography>
                    </Tooltip>
                  )}
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedParentId(user._id);
                        setSelectedUserRole(user.role || filters.role);
                        setViewModalOpen(true);
                      }}
                      aria-label="View user"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedParentId(user._id);
                        setSelectedUserRole(user.role || filters.role);
                        setEditModalOpen(true);
                      }}
                      aria-label="Edit user"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
      {/* View Modal */}
      <AdminViewModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedParentId(null);
          setSelectedUserRole(null);
        }}
        parentId={selectedParentId}
        userRole={selectedUserRole}
      />

      {/* Edit Modal */}
      <AdminEditUserModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedParentId(null);
          setSelectedUserRole(null);
          fetchParents(filters);
        }}
        parentId={selectedParentId}
        userRole={selectedUserRole}
      />
    </>
  );
};

export default AdminUsersTable;

