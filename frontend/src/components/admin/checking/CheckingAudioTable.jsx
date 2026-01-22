import React, { useState } from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  CheckCircleOutlined,
  CancelOutlined,
  PlayArrowOutlined,
  MoreVertOutlined,
  RefreshOutlined,
} from '@mui/icons-material';
import CheckingAudioPlayRecordingModal from './CheckingAudioPlayRecordingModal';

/**
 * CheckingAudioTable Component
 * 
 * Table displaying submitted audio assignments
 * Shows child info, assignment, status, submission date
 */
const CheckingAudioTable = ({
  submissions,
  loading,
  onReview,
}) => {
  const theme = useTheme();
  const [reviewingItem, setReviewingItem] = useState(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewDecision, setReviewDecision] = useState('');
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [playingSubmission, setPlayingSubmission] = useState(null);
  const [playModalOpen, setPlayModalOpen] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleApprove = (item) => {
    setReviewingItem(item);
    setReviewDecision('approved');
    setReviewFeedback('');
    setFeedbackDialog(true);
  };

  const handleReject = (item) => {
    setReviewingItem(item);
    setReviewDecision('rejected');
    setReviewFeedback('');
    setFeedbackDialog(true);
  };

  const handleSubmitReview = async () => {
    if (reviewingItem) {
      await onReview(
        reviewingItem.audioAssignment._id,
        reviewingItem.child._id,
        reviewDecision,
        reviewFeedback
      );
      setFeedbackDialog(false);
      setReviewingItem(null);
      setReviewFeedback('');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate stats
  const stats = {
    total: submissions.length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  };

  return (
    <>
      <Table
        sx={{
          backgroundColor: theme.palette.background.paper,
          '& thead th': {
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderBottom: `2px solid ${theme.palette.divider}`,
          },
          '& tbody tr': {
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
            borderBottom: `1px solid ${theme.palette.divider}`,
          },
          '& tbody td': {
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '0.9375rem',
            padding: '16px',
          },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell>Child</TableCell>
            <TableCell>Assignment</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Submitted On</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {submissions.map((item) => (
            <TableRow key={item._id} hover>
              {/* Child Info */}
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      width: 36,
                      height: 36,
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                  >
                    {item.child?.displayName?.[0]?.toUpperCase() || 'C'}
                  </Avatar>
                  <Box>
                    <Box sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                      {item.child?.displayName || 'Unknown'}
                    </Box>
                    <Box sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                      Age {item.child?.age || 'N/A'}
                    </Box>
                  </Box>
                </Box>
              </TableCell>

              {/* Assignment Info */}
              <TableCell>
                <Box>
                  <Box sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                    {item.audioAssignment?.title || 'Untitled'}
                  </Box>
                  <Box sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                    {item.timeSpent ? `${Math.round(item.timeSpent / 60)} min` : 'N/A'}
                  </Box>
                </Box>
              </TableCell>

              {/* Status */}
              <TableCell>
                <Chip
                  label={getStatusLabel(item.status)}
                  color={getStatusColor(item.status)}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                  }}
                />
              </TableCell>

              {/* Submission Date */}
              <TableCell>
                {formatDate(item.submittedAt || item.createdAt)}
              </TableCell>

              {/* Actions */}
              <TableCell align="right">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                  {/* Play Audio Button */}
                  {item.recordedAudio && (
                    <IconButton
                      size="small"
                      title="Play Recording"
                      sx={{
                        color: theme.palette.primary.main,
                        '&:hover': {
                          backgroundColor: theme.palette.primary.light + '20',
                        },
                      }}
                      onClick={() => {
                        setPlayingSubmission(item);
                        setPlayModalOpen(true);
                      }}
                    >
                      <PlayArrowOutlined fontSize="small" />
                    </IconButton>
                  )}

                  {/* Approve Button */}
                  {item.status === 'submitted' && (
                    <IconButton
                      size="small"
                      title="Approve"
                      sx={{
                        color: theme.palette.success.main,
                        '&:hover': {
                          backgroundColor: theme.palette.success.light + '20',
                        },
                      }}
                      onClick={() => handleApprove(item)}
                    >
                      <CheckCircleOutlined fontSize="small" />
                    </IconButton>
                  )}

                  {/* Reject Button */}
                  {item.status === 'submitted' && (
                    <IconButton
                      size="small"
                      title="Reject"
                      sx={{
                        color: theme.palette.error.main,
                        '&:hover': {
                          backgroundColor: theme.palette.error.light + '20',
                        },
                      }}
                      onClick={() => handleReject(item)}
                    >
                      <CancelOutlined fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Review Feedback Dialog */}
      <Dialog
        open={feedbackDialog}
        onClose={() => setFeedbackDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx:{
            borderRadius: '12px',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            fontSize: '1.125rem',
            color: theme.palette.text.primary,
          }}
        >
          {reviewDecision === 'approved' ? 'Approve Submission' : 'Reject Submission'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Add feedback (optional)"
            value={reviewFeedback}
            onChange={(e) => setReviewFeedback(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: 'Quicksand, sans-serif',
                borderRadius: '8px',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setFeedbackDialog(false)}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              textTransform: 'none',
              fontSize: '0.9375rem',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitReview}
            variant="contained"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              textTransform: 'none',
              fontSize: '0.9375rem',
              background: reviewDecision === 'approved'
                ? theme.palette.success.main
                : theme.palette.error.main,
              '&:hover': {
                background: reviewDecision === 'approved'
                  ? theme.palette.success.dark
                  : theme.palette.error.dark,
              },
            }}
          >
            {reviewDecision === 'approved' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Play Recording Modal */}
      <CheckingAudioPlayRecordingModal
        open={playModalOpen}
        onClose={() => {
          setPlayModalOpen(false);
          setPlayingSubmission(null);
        }}
        submission={playingSubmission}
        onReview={onReview}
      />
    </>
  );
};

export default CheckingAudioTable;
