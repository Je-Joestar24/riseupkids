import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
  CircularProgress,
  Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import useTeachers from '../../../hooks/teachersHook';

/**
 * AdminTeacherViewModal Component
 *
 * View modal for displaying teacher details (admin only)
 */
const AdminTeacherViewModal = ({ open, onClose, teacherId }) => {
  const theme = useTheme();
  const { fetchTeacher, currentTeacher, loading } = useTeachers();

  useEffect(() => {
    if (open && teacherId) {
      fetchTeacher(teacherId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teacherId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-label="Teacher details dialog"
      PaperProps={{
        sx: {
          borderRadius: '12px',
          padding: 0,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          color: theme.palette.text.primary,
          padding: 3,
          paddingBottom: 2,
          borderBottom: `1px solid ${theme.palette.border.main}`,
          backgroundColor: theme.palette.custom.bgSecondary,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.25rem',
            color: theme.palette.text.primary,
          }}
        >
          Teacher Details
        </Typography>
        <Button
          onClick={onClose}
          aria-label="Close teacher details dialog"
          sx={{
            minWidth: 'auto',
            padding: 0.5,
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.custom.bgTertiary,
            },
          }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ padding: 0 }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 6,
            }}
          >
            <CircularProgress sx={{ color: theme.palette.primary.main }} />
          </Box>
        ) : currentTeacher ? (
          <Box sx={{ padding: 3 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    color: theme.palette.text.primary,
                    marginBottom: 0.5,
                  }}
                >
                  {currentTeacher.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: 1 }}>
                  <EmailIcon sx={{ fontSize: '1rem', color: theme.palette.text.secondary }} />
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: theme.palette.text.secondary,
                      fontSize: '0.875rem',
                    }}
                  >
                    {currentTeacher.email}
                  </Typography>
                </Box>
              </Box>

              <Chip
                label={currentTeacher.isActive ? 'Active' : 'Archived'}
                size="small"
                icon={currentTeacher.isActive ? <CheckCircleIcon /> : <CancelIcon />}
                sx={{
                  backgroundColor: currentTeacher.isActive
                    ? `${theme.palette.success.main}20`
                    : `${theme.palette.text.secondary}20`,
                  color: currentTeacher.isActive
                    ? theme.palette.success.main
                    : theme.palette.text.secondary,
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
            </Box>

            <Divider sx={{ marginY: 2.5 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    color: theme.palette.text.secondary,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600,
                  }}
                >
                  Last Login
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, marginTop: 0.5 }}>
                  <CalendarIcon sx={{ fontSize: '0.875rem', color: theme.palette.text.secondary }} />
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: theme.palette.text.primary,
                      fontSize: '0.875rem',
                    }}
                  >
                    {formatDate(currentTeacher.lastLogin)}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    color: theme.palette.text.secondary,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600,
                  }}
                >
                  Account Created
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, marginTop: 0.5 }}>
                  <CalendarIcon sx={{ fontSize: '0.875rem', color: theme.palette.text.secondary }} />
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: theme.palette.text.primary,
                      fontSize: '0.875rem',
                    }}
                  >
                    {formatDate(currentTeacher.createdAt)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Box sx={{ padding: 3, textAlign: 'center' }}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
              }}
            >
              Teacher not found
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          padding: 3,
          paddingTop: 2,
          borderTop: `1px solid ${theme.palette.border.main}`,
          backgroundColor: theme.palette.custom.bgSecondary,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          aria-label="Close teacher details"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 500,
            fontSize: '0.875rem',
            padding: '8px 24px',
            borderRadius: '8px',
            textTransform: 'none',
            borderColor: theme.palette.border.main,
            color: theme.palette.text.primary,
            '&:hover': {
              borderColor: theme.palette.text.secondary,
              backgroundColor: theme.palette.custom.bgTertiary,
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminTeacherViewModal;

