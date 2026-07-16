import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import starCamLabelCatalogService from '../../../services/starCamLabelCatalogService';
import { showNotification } from '../../../store/slices/uiSlice';

const StarCamLabelCatalogPanel = ({ embedded = false }) => {
  const dispatch = useDispatch();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadLabels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await starCamLabelCatalogService.listManagedLabels({
        page,
        limit: 25,
        search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
      setSelectedIds(new Set());
    } catch (loadError) {
      const message = loadError.message || 'Failed to load scan objects';
      setError(message);
      dispatch(showNotification({ message, severity: 'error' }));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dispatch, page]);

  useEffect(() => {
    void loadLabels();
  }, [loadLabels]);

  const pageIds = useMemo(() => items.map((item) => item.labelId).filter(Boolean), [items]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));
  const enabledOnPageCount = items.filter((item) => item.isAvailableForMissions).length;

  const toggleRowSelection = (labelId, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(labelId);
      else next.delete(labelId);
      return next;
    });
  };

  const toggleSelectAllPage = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const updateSingleAvailability = async (labelId, isAvailableForMissions) => {
    setSaving(true);
    try {
      await starCamLabelCatalogService.updateLabelAvailability(labelId, isAvailableForMissions);
      setItems((prev) =>
        prev.map((item) =>
          item.labelId === labelId ? { ...item, isAvailableForMissions: Boolean(isAvailableForMissions) } : item
        )
      );
      dispatch(
        showNotification({
          message: isAvailableForMissions ? 'Object enabled for missions' : 'Object disabled for missions',
          severity: 'success',
        })
      );
    } catch (updateError) {
      dispatch(showNotification({ message: updateError.message || 'Failed to update object', severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const bulkUpdate = async (isAvailableForMissions, { selectAllMatching = false } = {}) => {
    setSaving(true);
    try {
      const payload = selectAllMatching
        ? {
            selectAllMatching: true,
            search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
            isAvailableForMissions,
          }
        : {
            labelIds: Array.from(selectedIds),
            isAvailableForMissions,
          };

      await starCamLabelCatalogService.bulkUpdateLabelAvailability(payload);
      await loadLabels();
      dispatch(
        showNotification({
          message: isAvailableForMissions ? 'Selected objects enabled' : 'Selected objects disabled',
          severity: 'success',
        })
      );
    } catch (bulkError) {
      dispatch(showNotification({ message: bulkError.message || 'Failed to bulk update objects', severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        mt: embedded ? 2 : 0,
        pt: embedded ? 2 : 0,
        borderTop: embedded ? (theme) => `1px solid ${theme.palette.divider}` : 'none',
      }}
    >
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700 }}>Scan Object Catalog</Typography>
        <Typography variant="body2" color="text.secondary">
          Check objects to allow them in mission autocomplete. Changes save immediately via the API.
        </Typography>
      </Box>

      <Stack spacing={1.5}>
        <TextField
          size="small"
          label="Search objects"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          helperText="Type at least 2 characters to filter the list"
          inputProps={{ 'aria-label': 'Search scan objects' }}
        />

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={allPageSelected}
                indeterminate={!allPageSelected && somePageSelected}
                onChange={(event) => toggleSelectAllPage(event.target.checked)}
                inputProps={{ 'aria-label': 'Select all objects on this page for bulk actions' }}
              />
            }
            label="Select all on page"
          />
          <Button
            size="small"
            variant="contained"
            disabled={saving || selectedIds.size === 0}
            onClick={() => bulkUpdate(true)}
          >
            Enable Selected ({selectedIds.size})
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={saving || selectedIds.size === 0}
            onClick={() => bulkUpdate(false)}
          >
            Disable Selected
          </Button>
          <Button size="small" variant="text" disabled={saving} onClick={() => bulkUpdate(true, { selectAllMatching: true })}>
            Enable All Matching
          </Button>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {loading ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <CircularProgress size={28} aria-label="Loading scan objects" />
          </Box>
        ) : (
          <TableContainer
            sx={{
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: '12px',
              maxHeight: embedded ? 360 : 480,
            }}
          >
            <Table size="small" stickyHeader aria-label="Scan object catalog with availability checkboxes">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ fontWeight: 700 }}>
                    Bulk
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Display Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    Use in Missions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography color="text.secondary">No scan objects found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.labelId} hover selected={Boolean(item.isAvailableForMissions)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.has(item.labelId)}
                          onChange={(event) => toggleRowSelection(item.labelId, event.target.checked)}
                          inputProps={{ 'aria-label': `Select ${item.displayName} for bulk update` }}
                        />
                      </TableCell>
                      <TableCell>{item.displayName}</TableCell>
                      <TableCell>{item.source}</TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={Boolean(item.isAvailableForMissions)}
                          disabled={saving}
                          onChange={(event) => updateSingleAvailability(item.labelId, event.target.checked)}
                          inputProps={{ 'aria-label': `Use ${item.displayName} in missions` }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Page {page} · {enabledOnPageCount} enabled on this page · {total} total
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" disabled={page <= 1 || loading} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Previous
            </Button>
            <Button size="small" disabled={page * 25 >= total || loading} onClick={() => setPage((prev) => prev + 1)}>
              Next
            </Button>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};

export default StarCamLabelCatalogPanel;
