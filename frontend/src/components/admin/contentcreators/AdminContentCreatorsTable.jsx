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
import useContentCreators from '../../../hooks/contentCreatorsHook';
import { useDispatch } from 'react-redux';
import { showConfirmationDialog } from '../../../store/slices/uiSlice';
import AdminContentCreatorViewModal from './AdminContentCreatorViewModal';
import AdminEditContentCreatorModal from './AdminEditContentCreatorModal';

/**
 * AdminContentCreatorsTable Component
 * 
 * Displays table of content creators with archive/restore functionality
 */
const AdminContentCreatorsTable = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const {
    contentCreators,
    loading,
    filters,
    archivecontentCreatorData,
    restorecontentCreatorData,
    fetchContentCreators,
  } = useContentCreators();

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedContentCreatorId, setSelectedContentCreatorId] = useState(null);

  const handleArchive = (contentCreator) => {
    dispatch(
      showConfirmationDialog({
        title: 'Archive contentCreator',
        message: `Are you sure you want to archive ${contentCreator.name}?`,
        onConfirm: async () => {
          try {
            await archivecontentCreatorData(contentCreator._id);
            // Refresh the list with current filters
            fetchContentCreators(filters);
          } catch (error) {
            // Error is handled by the hook
          }
        },
      })
    );
  };

  const handleRestore = (contentCreator) => {
    dispatch(
      showConfirmationDialog({
        title: 'Restore contentCreator',
        message: `Are you sure you want to restore ${contentCreator.name}?`,
        onConfirm: async () => {
          try {
            await restorecontentCreatorData(contentCreator._id);
            // Refresh the list with current filters
            fetchContentCreators(filters);
          } catch (error) {
            // Error is handled by the hook
          }
        },
      })
    );
  };

  if (loading && contentCreators.length === 0) {
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

  if (contentCreators.length === 0) {
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
          No contentCreators found
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
            <TableCell>Status</TableCell>
            <TableCell>Last Login</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {contentCreators.map((contentCreator) => (
            <TableRow
              key={contentCreator._id}
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
                  {contentCreator.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                  }}
                >
                  {contentCreator.email}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={contentCreator.isActive ? 'Active' : 'Archived'}
                  size="small"
                  sx={{
                    backgroundColor: contentCreator.isActive
                      ? `${theme.palette.success.main}20`
                      : `${theme.palette.text.secondary}20`,
                    color: contentCreator.isActive
                      ? theme.palette.success.main
                      : theme.palette.text.secondary,
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 500,
                    fontSize: '0.75rem',
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
                  {contentCreator.lastLogin
                    ? new Date(contentCreator.lastLogin).toLocaleDateString()
                    : 'Never'}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  {contentCreator.isActive ? (
                    <Tooltip title="Archive">
                      <IconButton
                        size="small"
                        aria-label="Archive contentCreator"
                        onClick={() => handleArchive(contentCreator)}
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
                        aria-label="Restore contentCreator"
                        onClick={() => handleRestore(contentCreator)}
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
                      aria-label="View contentCreator details"
                      onClick={() => {
                        setSelectedContentCreatorId(contentCreator._id);
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
                      aria-label="Edit contentCreator"
                      onClick={() => {
                        setSelectedContentCreatorId(contentCreator._id);
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
      <AdminContentCreatorViewModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedContentCreatorId(null);
        }}
        contentCreatorId={selectedContentCreatorId}
      />

      {/* Edit Modal */}
      <AdminEditContentCreatorModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedContentCreatorId(null);
          // Refresh the list after edit
          fetchContentCreators(filters);
        }}
        contentCreatorId={selectedContentCreatorId}
      />
    </>
  );
};

export default AdminContentCreatorsTable;

