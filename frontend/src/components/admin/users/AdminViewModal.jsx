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
  Avatar,
  Stack,
  Paper,
  CircularProgress,
  Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ChildCare as ChildCareIcon,
} from '@mui/icons-material';
import useParents from '../../../hooks/parentsHook';

/**
 * AdminViewModal Component
 * 
 * View modal for displaying parent user details with child profiles
 */
const AdminViewModal = ({ open, onClose, parentId }) => {
  const theme = useTheme();
  const { fetchParent, currentParent, loading } = useParents();

  useEffect(() => {
    if (open && parentId) {
      fetchParent(parentId);
    }
  }, [open, parentId]);

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
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          padding: 0,
        },
      }}
    >
      {/* Header */}
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
          Parent Details
        </Typography>
        <Button
          onClick={onClose}
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
        ) : currentParent ? (
          <Box sx={{ padding: 3 }}>
            {/* Parent Information Section */}
            <Paper
              sx={{
                padding: 3,
                marginBottom: 3,
                borderRadius: '12px',
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.border.main}`,
              }}
            >
              <Stack spacing={2.5}>
                {/* Name and Status */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                      {currentParent.name}
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
                        {currentParent.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={currentParent.isActive ? 'Active' : 'Archived'}
                    size="small"
                    icon={currentParent.isActive ? <CheckCircleIcon /> : <CancelIcon />}
                    sx={{
                      backgroundColor: currentParent.isActive
                        ? `${theme.palette.success.main}20`
                        : `${theme.palette.text.secondary}20`,
                      color: currentParent.isActive
                        ? theme.palette.success.main
                        : theme.palette.text.secondary,
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                    }}
                  />
                </Box>

                <Divider />

                {/* Details Grid */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box>
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
                        Subscription Status
                      </Typography>
                      <Chip
                        label={currentParent.subscriptionStatus || 'inactive'}
                        size="small"
                        sx={{
                          marginTop: 0.5,
                          backgroundColor: `${theme.palette.orange.main}20`,
                          color: theme.palette.orange.main,
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          textTransform: 'capitalize',
                        }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
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
                          {formatDate(currentParent.lastLogin)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
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
                          {formatDate(currentParent.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
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
                        Statistics
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, marginTop: 0.5 }}>
                        <Chip
                          label={`${currentParent.statistics?.activeChildren || 0} Active`}
                          size="small"
                          sx={{
                            backgroundColor: `${theme.palette.primary.main}20`,
                            color: theme.palette.primary.main,
                            fontFamily: 'Quicksand, sans-serif',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                          }}
                        />
                        <Chip
                          label={`${currentParent.statistics?.totalChildren || 0} Total`}
                          size="small"
                          sx={{
                            backgroundColor: `${theme.palette.text.secondary}20`,
                            color: theme.palette.text.secondary,
                            fontFamily: 'Quicksand, sans-serif',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                          }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Stack>
            </Paper>

            {/* Children Section */}
            <Paper
              sx={{
                padding: 3,
                borderRadius: '12px',
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.border.main}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 2.5 }}>
                <ChildCareIcon sx={{ color: theme.palette.primary.main }} />
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    color: theme.palette.text.primary,
                  }}
                >
                  Child Profiles ({currentParent.childProfiles?.length || 0})
                </Typography>
              </Box>

              {currentParent.childProfiles && currentParent.childProfiles.length > 0 ? (
                <Stack spacing={2}>
                  {currentParent.childProfiles.map((child, index) => (
                    <Paper
                      key={child._id || index}
                      sx={{
                        padding: 2,
                        borderRadius: '8px',
                        backgroundColor: theme.palette.custom.bgSecondary,
                        border: `1px solid ${theme.palette.border.main}`,
                        '&:hover': {
                          backgroundColor: theme.palette.custom.bgTertiary,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            backgroundColor: theme.palette.primary.main,
                            fontSize: '1.25rem',
                          }}
                        >
                          <PersonIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontFamily: 'Quicksand, sans-serif',
                              fontWeight: 600,
                              fontSize: '1rem',
                              color: theme.palette.text.primary,
                              marginBottom: 0.5,
                            }}
                          >
                            {child.displayName}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {child.age && (
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: 'Quicksand, sans-serif',
                                  color: theme.palette.text.secondary,
                                  fontSize: '0.875rem',
                                }}
                              >
                                Age: {child.age}
                              </Typography>
                            )}
                            <Chip
                              label={child.isActive ? 'Active' : 'Inactive'}
                              size="small"
                              sx={{
                                backgroundColor: child.isActive
                                  ? `${theme.palette.success.main}20`
                                  : `${theme.palette.text.secondary}20`,
                                color: child.isActive
                                  ? theme.palette.success.main
                                  : theme.palette.text.secondary,
                                fontFamily: 'Quicksand, sans-serif',
                                fontWeight: 500,
                                fontSize: '0.6875rem',
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box
                  sx={{
                    padding: 3,
                    textAlign: 'center',
                    backgroundColor: theme.palette.custom.bgSecondary,
                    borderRadius: '8px',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: theme.palette.text.secondary,
                      fontSize: '0.875rem',
                    }}
                  >
                    No child profiles found
                  </Typography>
                </Box>
              )}
            </Paper>
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
              Parent not found
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

export default AdminViewModal;

