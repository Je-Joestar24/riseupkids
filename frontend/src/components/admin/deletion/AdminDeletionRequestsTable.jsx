import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PlayArrow as ExecuteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import deletionRequestsService from '../../../services/deletionRequestsService';
import { showConfirmationDialog, showNotification } from '../../../store/slices/uiSlice';

const STATUS_COLORS = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'error',
  cancelled: 'default',
};

const STATUS_LABELS = {
  cancelled: 'Superseded',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeLabel(type) {
  return type === 'parent_account' ? 'Parent account' : 'Child profile';
}

const AdminDeletionRequestsTable = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await deletionRequestsService.list({
        status: statusFilter || undefined,
        limit: 100,
      });
      setRequests(response.data || []);
    } catch (error) {
      dispatch(showNotification({ message: error, type: 'error' }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleExecuteOne = (request) => {
    dispatch(
      showConfirmationDialog({
        title: 'Execute deletion purge',
        message: `Permanently purge data for this ${getTypeLabel(request.type).toLowerCase()} request? This cannot be undone.`,
        onConfirm: async () => {
          setActionId(request._id);
          try {
            const result = await deletionRequestsService.executeOne(request._id);
            dispatch(
              showNotification({
                message: result.message || 'Deletion request executed',
                type: 'success',
              })
            );
            await loadRequests();
          } catch (error) {
            dispatch(showNotification({ message: error, type: 'error' }));
          } finally {
            setActionId(null);
          }
        },
      })
    );
  };

  const handleExecuteDue = () => {
    dispatch(
      showConfirmationDialog({
        title: 'Process due deletions',
        message:
          'Run purge for all pending requests whose retention period has passed. Requests still within the waiting period will be skipped.',
        onConfirm: async () => {
          setBatchLoading(true);
          try {
            const result = await deletionRequestsService.executePending({ force: false });
            dispatch(
              showNotification({
                message: result.message || 'Due deletion requests processed',
                type: 'success',
              })
            );
            await loadRequests();
          } catch (error) {
            dispatch(showNotification({ message: error, type: 'error' }));
          } finally {
            setBatchLoading(false);
          }
        },
      })
    );
  };

  const handleForceAll = () => {
    dispatch(
      showConfirmationDialog({
        title: 'Force purge all pending',
        message:
          'Immediately purge ALL pending deletion requests, including those still within the retention period. Use only for testing or urgent compliance needs.',
        onConfirm: async () => {
          setBatchLoading(true);
          try {
            const result = await deletionRequestsService.executePending({ force: true });
            dispatch(
              showNotification({
                message: result.message || 'Pending deletion requests processed',
                type: 'success',
              })
            );
            await loadRequests();
          } catch (error) {
            dispatch(showNotification({ message: error, type: 'error' }));
          } finally {
            setBatchLoading(false);
          }
        },
      })
    );
  };

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: 2.5,
          borderRadius: '12px',
          border: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
        >
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="deletion-status-filter-label">Status</InputLabel>
            <Select
              labelId="deletion-status-filter-label"
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="cancelled">Superseded</MenuItem>
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadRequests}
              disabled={loading || batchLoading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleExecuteDue}
              disabled={loading || batchLoading}
            >
              {batchLoading ? 'Processing…' : 'Process due deletions'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleForceAll}
              disabled={loading || batchLoading}
            >
              Force all pending
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: '12px',
          border: `1px solid ${theme.palette.border.main}`,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table aria-label="Deletion requests table">
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.custom.bgSecondary }}>
                <TableCell>Type</TableCell>
                <TableCell>Parent</TableCell>
                <TableCell>Child</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Scheduled purge</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography
                      variant="body2"
                      sx={{ py: 4, textAlign: 'center', color: theme.palette.text.secondary }}
                    >
                      No deletion requests found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => {
                  const isPending = request.status === 'pending' || request.status === 'failed';
                  const isDue =
                    request.status === 'pending' &&
                    (!request.scheduledPurgeAt ||
                      new Date(request.scheduledPurgeAt) <= new Date());

                  return (
                    <TableRow key={request._id} hover>
                      <TableCell>{getTypeLabel(request.type)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {request.userId?.name || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {request.userId?.email || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{request.childId?.displayName || '—'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={STATUS_LABELS[request.status] || request.status}
                            size="small"
                            color={STATUS_COLORS[request.status] || 'default'}
                            sx={{ textTransform: 'capitalize' }}
                          />
                          {isDue && (
                            <Chip label="Due" size="small" color="warning" variant="outlined" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{formatDate(request.requestedAt)}</TableCell>
                      <TableCell>{formatDate(request.scheduledPurgeAt)}</TableCell>
                      <TableCell>{formatDate(request.completedAt)}</TableCell>
                      <TableCell align="center">
                        {isPending ? (
                          <Tooltip title="Execute purge now">
                            <span>
                              <IconButton
                                size="small"
                                aria-label={`Execute deletion request ${request._id}`}
                                onClick={() => handleExecuteOne(request)}
                                disabled={actionId === request._id || batchLoading}
                              >
                                {actionId === request._id ? (
                                  <CircularProgress size={18} />
                                ) : (
                                  <ExecuteIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Stack>
  );
};

export default AdminDeletionRequestsTable;
