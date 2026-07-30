import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Stack,
  Chip,
  Button,
  LinearProgress,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import LockOpenOutlined from '@mui/icons-material/LockOpenOutlined';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';

const statusColor = (status, override) => {
  if (override === 'force_unlock') return 'success';
  if (override === 'force_lock' || status === 'locked') return 'default';
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'info';
  return 'warning';
};

const statusLabel = (status, override) => {
  if (override === 'force_unlock') return 'Admin unlocked';
  if (override === 'force_lock') return 'Admin locked';
  if (status === 'completed') return 'Completed';
  if (status === 'in_progress') return 'In progress';
  if (status === 'not_started') return 'Not started';
  if (status === 'locked') return 'Locked';
  return status || 'Unknown';
};

const ModuleAccessChildDetailDrawer = ({
  open,
  child,
  modules = [],
  loading,
  busyCourseId,
  onClose,
  onUnlock,
  onLock,
  onClearOverride,
}) => {
  const theme = useTheme();
  const [confirm, setConfirm] = useState(null);
  const [note, setNote] = useState('');

  const handleConfirm = async () => {
    if (!confirm || !child?._id) return;
    const { action, courseId } = confirm;
    const trimmed = note.trim();
    setConfirm(null);
    setNote('');
    if (action === 'unlock') await onUnlock?.(child._id, courseId, trimmed);
    if (action === 'lock') await onLock?.(child._id, courseId, trimmed);
    if (action === 'clear') await onClearOverride?.(child._id, courseId, trimmed);
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 480 }, p: 0 },
          'aria-label': 'Child module access detail',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2.5,
            borderBottom: `1px solid ${theme.palette.border?.main || theme.palette.divider}`,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: '1.25rem',
              }}
            >
              {child?.displayName || 'Child'}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '0.8125rem',
                color: theme.palette.text.secondary,
              }}
            >
              {child?.parent?.email || child?.parent?.name || 'No parent email'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close module access detail">
            <CloseOutlined />
          </IconButton>
        </Box>

        <Box sx={{ p: 2.5, overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2}>
              {modules.map((mod) => {
                const busy = busyCourseId === mod.courseId;
                return (
                  <Box
                    key={mod.courseId}
                    sx={{
                      border: `1px solid ${theme.palette.border?.main || theme.palette.divider}`,
                      borderRadius: '12px',
                      p: 2,
                      backgroundColor: theme.palette.background.paper,
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontFamily: 'Quicksand, sans-serif',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                          }}
                        >
                          {mod.stepOrder != null ? `Step ${mod.stepOrder}: ` : ''}
                          {mod.title || 'Untitled module'}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: 'Quicksand, sans-serif',
                            fontSize: '0.75rem',
                            color: theme.palette.text.secondary,
                            mt: 0.5,
                          }}
                        >
                          {mod.completedContent}/{mod.totalContent} content ·{' '}
                          {mod.progressPercentage || 0}%
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={statusLabel(mod.status, mod.accessOverride)}
                        color={statusColor(mod.status, mod.accessOverride)}
                        sx={{ fontFamily: 'Quicksand, sans-serif' }}
                      />
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={mod.progressPercentage || 0}
                      sx={{ mt: 1.5, height: 6, borderRadius: 3 }}
                      aria-label={`${mod.title} progress`}
                    />
                    <Divider sx={{ my: 1.5 }} />
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {mod.canUnlock ? (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<LockOpenOutlined />}
                          disabled={busy}
                          onClick={() =>
                            setConfirm({ action: 'unlock', courseId: mod.courseId, title: mod.title })
                          }
                          sx={{
                            fontFamily: 'Quicksand, sans-serif',
                            textTransform: 'none',
                            backgroundColor: theme.palette.orange?.main,
                            '&:hover': { backgroundColor: theme.palette.orange?.dark },
                          }}
                          aria-label={`Unlock ${mod.title}`}
                        >
                          Unlock
                        </Button>
                      ) : null}
                      {mod.canLock ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          startIcon={<LockOutlined />}
                          disabled={busy}
                          onClick={() =>
                            setConfirm({ action: 'lock', courseId: mod.courseId, title: mod.title })
                          }
                          sx={{ fontFamily: 'Quicksand, sans-serif', textTransform: 'none' }}
                          aria-label={`Lock ${mod.title}`}
                        >
                          Lock
                        </Button>
                      ) : null}
                      {mod.canClearOverride ? (
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<RestartAltOutlined />}
                          disabled={busy}
                          onClick={() =>
                            setConfirm({ action: 'clear', courseId: mod.courseId, title: mod.title })
                          }
                          sx={{ fontFamily: 'Quicksand, sans-serif', textTransform: 'none' }}
                          aria-label={`Reset automatic access for ${mod.title}`}
                        >
                          Reset automatic
                        </Button>
                      ) : null}
                      {!mod.canLock && !mod.canUnlock && !mod.canClearOverride ? (
                        <Typography
                          sx={{
                            fontFamily: 'Quicksand, sans-serif',
                            fontSize: '0.8125rem',
                            color: theme.palette.text.secondary,
                          }}
                        >
                          No actions available
                        </Typography>
                      ) : null}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </Drawer>

      <Dialog
        open={Boolean(confirm)}
        onClose={() => {
          setConfirm(null);
          setNote('');
        }}
        aria-labelledby="module-access-confirm-title"
      >
        <DialogTitle id="module-access-confirm-title" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
          {confirm?.action === 'unlock' && 'Unlock module?'}
          {confirm?.action === 'lock' && 'Lock module?'}
          {confirm?.action === 'clear' && 'Reset to automatic access?'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', mb: 2 }}>
            {confirm?.title}
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            inputProps={{ maxLength: 500, 'aria-label': 'Optional note' }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirm(null);
              setNote('');
            }}
            sx={{ fontFamily: 'Quicksand, sans-serif', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              textTransform: 'none',
              backgroundColor: theme.palette.orange?.main,
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ModuleAccessChildDetailDrawer;
