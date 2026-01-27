import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  VideoCall as VideoCallIcon,
  ContentCopy as ContentCopyIcon,
  FiberManualRecord as FiberManualRecordIcon,
} from '@mui/icons-material';
import useMeetings from '../../../hooks/meetingHooks';
import MeetingUpdateModal from './MeetingUpdateModal';
import { themeColors } from '../../../config/themeColors';

/**
 * MeetingList Component
 * 
 * Displays list of meetings in a table format with actions
 */
const MeetingList = () => {
  const theme = useTheme();
  const {
    meetings,
    loading,
    error,
    archiveMeeting,
    restoreMeeting,
    cancelMeeting,
    deleteMeeting,
    fetchMeetings,
    setCurrent,
  } = useMeetings();

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleMenuOpen = (event, meeting) => {
    setAnchorEl(event.currentTarget);
    setSelectedMeeting(meeting);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMeeting(null);
  };

  const handleEdit = () => {
    if (selectedMeeting) {
      // Set the current meeting in Redux before opening modal
      // This ensures the modal can access it immediately from the slice
      setCurrent(selectedMeeting);
      setUpdateModalOpen(true);
    }
    handleMenuClose();
  };

  const handleUpdateSuccess = () => {
    setUpdateModalOpen(false);
    fetchMeetings();
  };

  const handleArchive = async () => {
    if (selectedMeeting) {
      try {
        await archiveMeeting(selectedMeeting._id);
        await fetchMeetings();
      } catch (err) {
        console.error('Failed to archive meeting:', err);
      }
    }
    handleMenuClose();
  };

  const handleRestore = async () => {
    if (selectedMeeting) {
      try {
        await restoreMeeting(selectedMeeting._id);
        await fetchMeetings();
      } catch (err) {
        console.error('Failed to restore meeting:', err);
      }
    }
    handleMenuClose();
  };

  const handleCancel = async () => {
    if (selectedMeeting) {
      try {
        await cancelMeeting(selectedMeeting._id);
        await fetchMeetings();
      } catch (err) {
        console.error('Failed to cancel meeting:', err);
      }
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setMeetingToDelete(selectedMeeting);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (meetingToDelete) {
      try {
        await deleteMeeting(meetingToDelete._id);
        await fetchMeetings();
      } catch (err) {
        console.error('Failed to delete meeting:', err);
      }
    }
    setDeleteDialogOpen(false);
    setMeetingToDelete(null);
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusChipSx = (status) => {
    if (status === 'scheduled') {
      return {
        fontFamily: 'Quicksand, sans-serif',
        textTransform: 'capitalize',
        backgroundColor: `${themeColors.orange}20`,
        color: themeColors.orange,
        border: `1px solid ${themeColors.borderOrange}`,
        fontWeight: 600,
      };
    }
    return {
      fontFamily: 'Quicksand, sans-serif',
      textTransform: 'capitalize',
    };
  };

  if (loading && meetings.length === 0) {
    return (
      <Paper
        sx={{
          padding: 4,
          textAlign: 'center',
          borderRadius: '12px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
          Loading meetings...
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        sx={{
          padding: 4,
          borderRadius: '12px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Alert severity="error" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
          {error.message || 'Failed to load meetings'}
        </Alert>
      </Paper>
    );
  }

  if (meetings.length === 0) {
    return (
      <Paper
        sx={{
          padding: 4,
          textAlign: 'center',
          borderRadius: '12px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <VideoCallIcon
          sx={{
            fontSize: 64,
            color: theme.palette.text.secondary,
            marginBottom: 2,
          }}
        />
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            color: theme.palette.text.primary,
            marginBottom: 1,
          }}
        >
          No meetings found
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
          }}
        >
          Create your first meeting to get started
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      {copySuccess && (
        <Alert
          severity="success"
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 9999,
            fontFamily: 'Quicksand, sans-serif',
          }}
        >
          Link copied to clipboard!
        </Alert>
      )}

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: '12px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
          boxShadow: theme.shadows[2],
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>
                Title
              </TableCell>
              <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>
                Start Time
              </TableCell>
              <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>
                End Time
              </TableCell>
              <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>
                Status
              </TableCell>
              <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>
                Meet Link
              </TableCell>
              <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {meetings.map((meeting) => (
              <TableRow
                key={meeting._id}
                sx={{
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <TableCell sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  <Stack spacing={0.5}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                      }}
                    >
                      {meeting.title}
                    </Typography>
                    {meeting.description && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: theme.palette.text.secondary,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {meeting.description}
                      </Typography>
                    )}
                    {meeting.isArchived && (
                      <Chip
                        label="Archived"
                        size="small"
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                    )}
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  {formatDate(meeting.startTime)}
                </TableCell>
                <TableCell sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  {formatDate(meeting.endTime)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={meeting.status}
                    color={getStatusColor(meeting.status)}
                    size="small"
                    sx={getStatusChipSx(meeting.status)}
                  />
                </TableCell>
                <TableCell sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  {meeting.meetLink ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Link
                        href={meeting.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: themeColors.orange,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${themeColors.borderOrange}`,
                          backgroundColor: `${themeColors.orange}10`,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: `${themeColors.orange}20`,
                            borderColor: themeColors.orange,
                            transform: 'translateY(-1px)',
                            boxShadow: `0 2px 4px ${themeColors.borderOrange}`,
                          },
                        }}
                      >
                        <FiberManualRecordIcon
                          sx={{
                            fontSize: '0.625rem',
                            color: themeColors.orange,
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%, 100%': {
                                opacity: 1,
                              },
                              '50%': {
                                opacity: 0.5,
                              },
                            },
                          }}
                        />
                        Join Meeting
                      </Link>
                      <Tooltip title="Copy link">
                        <IconButton
                          size="small"
                          onClick={() => handleCopyLink(meeting.meetLink)}
                          sx={{
                            padding: 0.5,
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            },
                          }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.secondary,
                        fontStyle: 'italic',
                      }}
                    >
                      No link
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, meeting)}
                    sx={{
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            fontFamily: 'Quicksand, sans-serif',
            minWidth: 180,
          },
        }}
      >
        <MenuItem onClick={handleEdit} sx={{ fontFamily: 'Quicksand, sans-serif' }}>
          <EditIcon sx={{ marginRight: 1, fontSize: 20 }} />
          Edit
        </MenuItem>
        {selectedMeeting?.isArchived ? (
          <MenuItem onClick={handleRestore} sx={{ fontFamily: 'Quicksand, sans-serif' }}>
            <RestoreIcon sx={{ marginRight: 1, fontSize: 20 }} />
            Restore
          </MenuItem>
        ) : (
          <>
            {selectedMeeting?.status === 'scheduled' && (
              <MenuItem onClick={handleCancel} sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                <CancelIcon sx={{ marginRight: 1, fontSize: 20 }} />
                Cancel
              </MenuItem>
            )}
            <MenuItem onClick={handleArchive} sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              <ArchiveIcon sx={{ marginRight: 1, fontSize: 20 }} />
              Archive
            </MenuItem>
          </>
        )}
        <MenuItem
          onClick={handleDeleteClick}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.error.main,
          }}
        >
          <DeleteIcon sx={{ marginRight: 1, fontSize: 20 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            fontFamily: 'Quicksand, sans-serif',
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
          Delete Meeting
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif' }}>
            Are you sure you want to permanently delete this meeting? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              textTransform: 'none',
              borderRadius: '8px',
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Meeting Modal */}
      <MeetingUpdateModal
        open={updateModalOpen}
        onClose={() => {
          setUpdateModalOpen(false);
          setSelectedMeeting(null);
        }}
        meeting={selectedMeeting}
        onSuccess={handleUpdateSuccess}
      />
    </>
  );
};

export default MeetingList;
