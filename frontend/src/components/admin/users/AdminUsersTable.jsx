import React, { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
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
  AdminPanelSettingsOutlined as ManageAccessIcon,
} from '@mui/icons-material';
import useParents from '../../../hooks/parentsHook';
import { USER_ROLES } from '../../../config/constants';
import { getAdminUserRoleLabel, isParentRole } from '../../../utils/adminUserRoles';
import { joinLabels, summarizeAreas } from '../../../utils/accessAreaOptions';
import { getAdminAccountDisplayStatus } from '../../../utils/accountDisplayStatus';
import { useDispatch } from 'react-redux';
import { showConfirmationDialog } from '../../../store/slices/uiSlice';
import AdminViewModal from './AdminViewModal';
import AdminEditUserModal from './AdminEditUserModal';
import ManageAccessDialog from './ManageAccessDialog';

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
    accessAreaOptions,
    loadAccessAreas,
  } = useParents();

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [selectedUserRole, setSelectedUserRole] = useState(null);

  const showParentColumns = isParentRole(filters.role);
  // Content creators: an Access column, a Manage access action, and ticking several to change them together
  const showCreatorColumns = filters.role === USER_ROLES.CONTENT_CREATOR;
  const [selectedIds, setSelectedIds] = useState([]);
  const [manageCreators, setManageCreators] = useState(null);

  // The checkbox names are needed for the Access column
  useEffect(() => {
    if (showCreatorColumns) loadAccessAreas().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreatorColumns]);

  // Only people still on this page stay ticked (a new page or filter starts clean)
  useEffect(() => {
    setSelectedIds((current) => {
      const still = current.filter((id) => parents.some((user) => user._id === id));
      return still.length === current.length ? current : still;
    });
  }, [parents]);

  const creatorsOnPage = parents.filter((user) => (user.role || filters.role) === USER_ROLES.CONTENT_CREATOR);
  const allTicked = creatorsOnPage.length > 0 && creatorsOnPage.every((user) => selectedIds.includes(user._id));
  const toggleOne = (id) => setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const toggleAll = () => setSelectedIds(allTicked ? [] : creatorsOnPage.map((user) => user._id));
  const selectedCreators = creatorsOnPage.filter((user) => selectedIds.includes(user._id));

  const accessCell = (user) => {
    const list = Array.isArray(user.accessAreas) ? user.accessAreas : [];
    const summary = summarizeAreas(list, accessAreaOptions.areas);
    const everything = joinLabels(list, accessAreaOptions.areas);
    if (accessAreaOptions.areas.length === 0) {
      return <Chip size="small" label={`${list.length} ${list.length === 1 ? 'area' : 'areas'}`} />;
    }
    if (summary.all) {
      return (
        <Tooltip title={everything}>
          <Chip size="small" label="All areas" />
        </Tooltip>
      );
    }
    return (
      <Tooltip title={everything || 'No access'}>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {summary.labels.map((label) => (
            <Chip key={label} size="small" label={label} />
          ))}
          {summary.more > 0 && <Chip size="small" variant="outlined" label={`+${summary.more}`} />}
        </Box>
      </Tooltip>
    );
  };

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
    {showCreatorColumns && selectedIds.length > 0 && (
      <Paper
        role="region"
        aria-label="Selected content creators"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 1.5,
          mb: 1.5,
          borderRadius: '12px',
          border: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {selectedIds.length} selected
        </Typography>
        <Button size="small" variant="contained" onClick={() => setManageCreators(selectedCreators)} sx={{ textTransform: 'none' }}>
          Manage access
        </Button>
        <Button size="small" onClick={() => setSelectedIds([])} sx={{ textTransform: 'none' }}>
          Clear selection
        </Button>
      </Paper>
    )}
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
            {showCreatorColumns && (
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allTicked}
                  indeterminate={selectedIds.length > 0 && !allTicked}
                  onChange={toggleAll}
                  inputProps={{ 'aria-label': 'Select all content creators on this page' }}
                />
              </TableCell>
            )}
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            {showParentColumns && <TableCell>Children</TableCell>}
            {showCreatorColumns && <TableCell>Access</TableCell>}
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
              {showCreatorColumns && (
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(user._id)}
                    onChange={() => toggleOne(user._id)}
                    inputProps={{ 'aria-label': `Select ${user.name}` }}
                  />
                </TableCell>
              )}
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
              {showCreatorColumns && <TableCell>{accessCell(user)}</TableCell>}
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
                  {(user.role || filters.role) === USER_ROLES.CONTENT_CREATOR && (
                    <Tooltip title="Manage access">
                      <IconButton
                        size="small"
                        onClick={() => setManageCreators([user])}
                        aria-label={`Manage access for ${user.name}`}
                      >
                        <ManageAccessIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
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

      {/* Manage access: one creator, or the ticked ones together */}
      <ManageAccessDialog
        open={Boolean(manageCreators)}
        onClose={() => setManageCreators(null)}
        creators={manageCreators || []}
        onSaved={() => setSelectedIds([])}
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

