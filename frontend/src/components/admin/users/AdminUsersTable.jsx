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

  const handleArchive = (parent) => {
    dispatch(
      showConfirmationDialog({
        title: 'Archive Parent',
        message: `Are you sure you want to archive ${parent.name}? This will also archive all associated child profiles.`,
        onConfirm: async () => {
          try {
            await archiveParentData(parent._id);
            // Refresh the list with current filters
            fetchParents(filters);
          } catch (error) {
            // Error is handled by the hook
          }
        },
      })
    );
  };

  const handleRestore = (parent) => {
    dispatch(
      showConfirmationDialog({
        title: 'Restore Parent',
        message: `Are you sure you want to restore ${parent.name}?`,
        onConfirm: async () => {
          try {
            await restoreParentData(parent._id);
            // Refresh the list with current filters
            fetchParents(filters);
          } catch (error) {
            // Error is handled by the hook
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
          No parents found
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
            <TableCell>Children</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Subscription</TableCell>
            <TableCell>Last Login</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {parents.map((parent) => (
            <TableRow
              key={parent._id}
              sx={{
                '&:hover': {
                  backgroundColor: theme.palette.custom.bgTertiary,
                },
                '& td': {
                  fontFamily: 'Quicksand, sans-serif',
                  padding: 2,
                  borderBottom: `1px solid ${theme.palette.border.main}`,
                },
              }}
            >
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                  }}
                >
                  {parent.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                  }}
                >
                  {parent.email}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={`${parent.childProfilesCount || 0} active`}
                  size="small"
                  sx={{
                    backgroundColor: `${theme.palette.primary.main}20`,
                    color: theme.palette.primary.main,
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={parent.isActive ? 'Active' : 'Archived'}
                  size="small"
                  sx={{
                    backgroundColor: parent.isActive
                      ? `${theme.palette.success.main}20`
                      : `${theme.palette.text.secondary}20`,
                    color: parent.isActive
                      ? theme.palette.success.main
                      : theme.palette.text.secondary,
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={parent.subscriptionStatus || 'inactive'}
                  size="small"
                  sx={{
                    backgroundColor: `${theme.palette.orange.main}20`,
                    color: theme.palette.orange.main,
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    textTransform: 'capitalize',
                  }}
                />
              </TableCell>
              <TableCell>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: '0.75rem',
                  }}
                >
                  {parent.lastLogin
                    ? new Date(parent.lastLogin).toLocaleDateString()
                    : 'Never'}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  {parent.isActive ? (
                    <Tooltip title="Archive">
                      <IconButton
                        size="small"
                        onClick={() => handleArchive(parent)}
                        sx={{
                          color: theme.palette.text.secondary,
                          '&:hover': {
                            backgroundColor: `${theme.palette.error.main}20`,
                            color: theme.palette.error.main,
                          },
                        }}
                      >
                        <ArchiveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Restore">
                      <IconButton
                        size="small"
                        onClick={() => handleRestore(parent)}
                        sx={{
                          color: theme.palette.text.secondary,
                          '&:hover': {
                            backgroundColor: `${theme.palette.success.main}20`,
                            color: theme.palette.success.main,
                          },
                        }}
                      >
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedParentId(parent._id);
                        setViewModalOpen(true);
                      }}
                      sx={{
                        color: theme.palette.text.secondary,
                        '&:hover': {
                          backgroundColor: `${theme.palette.primary.main}20`,
                          color: theme.palette.primary.main,
                        },
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedParentId(parent._id);
                        setEditModalOpen(true);
                      }}
                      sx={{
                        color: theme.palette.text.secondary,
                        '&:hover': {
                          backgroundColor: `${theme.palette.orange.main}20`,
                          color: theme.palette.orange.main,
                        },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
      {/* View Modal */}
      <AdminViewModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedParentId(null);
        }}
        parentId={selectedParentId}
      />

      {/* Edit Modal */}
      <AdminEditUserModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedParentId(null);
          // Refresh the list after edit
          fetchParents(filters);
        }}
        parentId={selectedParentId}
      />
    </>
  );
};

export default AdminUsersTable;

