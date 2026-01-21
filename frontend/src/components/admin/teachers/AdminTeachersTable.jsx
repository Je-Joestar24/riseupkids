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
import useTeachers from '../../../hooks/teachersHook';
import { useDispatch } from 'react-redux';
import { showConfirmationDialog } from '../../../store/slices/uiSlice';
import AdminTeacherViewModal from './AdminTeacherViewModal';
import AdminEditTeacherModal from './AdminEditTeacherModal';

/**
 * AdminTeachersTable Component
 * 
 * Displays table of teachers with archive/restore functionality
 */
const AdminTeachersTable = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const {
    teachers,
    loading,
    filters,
    archiveTeacherData,
    restoreTeacherData,
    fetchTeachers,
  } = useTeachers();

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);

  const handleArchive = (teacher) => {
    dispatch(
      showConfirmationDialog({
        title: 'Archive Teacher',
        message: `Are you sure you want to archive ${teacher.name}?`,
        onConfirm: async () => {
          try {
            await archiveTeacherData(teacher._id);
            // Refresh the list with current filters
            fetchTeachers(filters);
          } catch (error) {
            // Error is handled by the hook
          }
        },
      })
    );
  };

  const handleRestore = (teacher) => {
    dispatch(
      showConfirmationDialog({
        title: 'Restore Teacher',
        message: `Are you sure you want to restore ${teacher.name}?`,
        onConfirm: async () => {
          try {
            await restoreTeacherData(teacher._id);
            // Refresh the list with current filters
            fetchTeachers(filters);
          } catch (error) {
            // Error is handled by the hook
          }
        },
      })
    );
  };

  if (loading && teachers.length === 0) {
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

  if (teachers.length === 0) {
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
          No teachers found
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
          {teachers.map((teacher) => (
            <TableRow
              key={teacher._id}
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
                  {teacher.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                  }}
                >
                  {teacher.email}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={teacher.isActive ? 'Active' : 'Archived'}
                  size="small"
                  sx={{
                    backgroundColor: teacher.isActive
                      ? `${theme.palette.success.main}20`
                      : `${theme.palette.text.secondary}20`,
                    color: teacher.isActive
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
                  {teacher.lastLogin
                    ? new Date(teacher.lastLogin).toLocaleDateString()
                    : 'Never'}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  {teacher.isActive ? (
                    <Tooltip title="Archive">
                      <IconButton
                        size="small"
                        aria-label="Archive teacher"
                        onClick={() => handleArchive(teacher)}
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
                        aria-label="Restore teacher"
                        onClick={() => handleRestore(teacher)}
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
                      aria-label="View teacher details"
                      onClick={() => {
                        setSelectedTeacherId(teacher._id);
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
                      aria-label="Edit teacher"
                      onClick={() => {
                        setSelectedTeacherId(teacher._id);
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
      <AdminTeacherViewModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedTeacherId(null);
        }}
        teacherId={selectedTeacherId}
      />

      {/* Edit Modal */}
      <AdminEditTeacherModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTeacherId(null);
          // Refresh the list after edit
          fetchTeachers(filters);
        }}
        teacherId={selectedTeacherId}
      />
    </>
  );
};

export default AdminTeachersTable;

