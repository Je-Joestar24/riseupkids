import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { diffAreas, orderAreas } from '../../../utils/accessAreaOptions';

/**
 * The access checkboxes for a content creator (docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md). One component for every
 * screen that shows them (Add step 2, Edit, Manage access, View), so they always look and behave the same.
 *
 * @param {Object} props
 * @param {Array<{ key: string, label: string, help: string, legacy?: boolean }>} props.areas the checkboxes, from the server
 * @param {string[]} props.value the ticked keys
 * @param {(next: string[]) => void} [props.onChange] called with the new ticked keys, in checkbox order
 * @param {string[]} [props.original] when given, a row that differs from it is marked "Will be added" / "Will be removed"
 * @param {Object<string, number>} [props.addedCounts] several people: for each area, how many would GAIN it (the marks then come from the counts)
 * @param {Object<string, number>} [props.removedCounts] bulk: for each area, how many people would LOSE it
 * @param {boolean} [props.readOnly] show ticked / not ticked only (the View screen)
 * @param {boolean} [props.disabled] while saving
 * @param {boolean} [props.loading] the checkboxes are still being fetched
 * @param {string|null} [props.loadError] the checkboxes could not be fetched
 * @param {() => void} [props.onRetry] try fetching them again
 * @param {string} [props.label] accessible name of the group
 */
const ContentCreatorAccessChecklist = ({
  areas = [],
  value = [],
  onChange,
  original,
  addedCounts,
  removedCounts,
  readOnly = false,
  disabled = false,
  loading = false,
  loadError = null,
  onRetry,
  label = 'What this person can use',
}) => {
  const theme = useTheme();

  if (loading && areas.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }} role="status">
        <CircularProgress size={20} />
        <Typography variant="body2">Loading the access options…</Typography>
      </Box>
    );
  }

  if (loadError && areas.length === 0) {
    return (
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          ) : undefined
        }
      >
        {loadError}
      </Alert>
    );
  }

  const ticked = new Set(value);
  const change = original ? diffAreas(original, value, areas) : { added: [], removed: [] };

  const setTicked = (next) => {
    if (onChange) onChange(orderAreas(next, areas));
  };
  const toggle = (key) => setTicked(ticked.has(key) ? value.filter((item) => item !== key) : [...value, key]);

  const mark = (key) => {
    const counted = Boolean(addedCounts || removedCounts);
    if (!original && !counted) return null;
    // With counts (several people at once) the marks come from the counts; otherwise from the one list it started as
    const lose = counted ? (removedCounts?.[key] ?? 0) > 0 : change.removed.includes(key);
    const gain = counted ? (addedCounts?.[key] ?? 0) > 0 : change.added.includes(key);
    if (!lose && !gain) return null;
    const count = lose ? removedCounts?.[key] : addedCounts?.[key];
    const suffix = typeof count === 'number' ? ` for ${count} ${count === 1 ? 'person' : 'people'}` : '';
    return (
      <Chip
        size="small"
        label={`${lose ? 'Will be removed' : 'Will be added'}${suffix}`}
        color={lose ? 'error' : 'success'}
        variant="outlined"
        sx={{ ml: 1 }}
      />
    );
  };

  return (
    <Box>
      {!readOnly && (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Button size="small" onClick={() => setTicked(areas.map((area) => area.key))} disabled={disabled} sx={{ textTransform: 'none' }}>
            Select all
          </Button>
          <Button size="small" onClick={() => setTicked([])} disabled={disabled} sx={{ textTransform: 'none' }}>
            Clear
          </Button>
        </Stack>
      )}

      <FormGroup aria-label={label} role="group">
        {areas.map((area) => {
          const isTicked = ticked.has(area.key);
          return (
            <Box key={area.key} sx={{ mb: 0.5 }}>
              <FormControlLabel
                sx={{ alignItems: 'flex-start', m: 0 }}
                control={
                  <Checkbox
                    checked={isTicked}
                    onChange={() => toggle(area.key)}
                    disabled={disabled || readOnly}
                    inputProps={{ 'aria-label': area.label }}
                    sx={{ pt: 0.5, '&.Mui-checked': { color: theme.palette.orange?.main } }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" component="span" sx={{ fontWeight: 600 }}>
                      {area.label}
                    </Typography>
                    {mark(area.key)}
                    {area.help && (
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {area.help}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </Box>
          );
        })}
      </FormGroup>
    </Box>
  );
};

export default ContentCreatorAccessChecklist;
