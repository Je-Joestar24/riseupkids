import React, { useEffect, useState } from 'react';
import { IconButton, InputAdornment, Paper, Stack, Tab, Tabs, TextField } from '@mui/material';
import { Close as ClearIcon, Search as SearchIcon } from '@mui/icons-material';
import { EXPERIENCE_STATUS } from '../../../services/experienceAdminService';

export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_MAX_LENGTH = 100;

/**
 * Search by title (sent 300 ms after the admin stops typing, so each key does not make a request) and the
 * All / Published / Drafts tabs with how many are in each. The counts ignore the filter and the search.
 *
 * @param {{ search: string, status: string, counts: { all: number, published: number, draft: number }, onSearchChange: (text: string) => void, onStatusChange: (status: string) => void }} props
 */
const ExperiencesFilters = ({ search = '', status = EXPERIENCE_STATUS.ALL, counts, onSearchChange, onStatusChange }) => {
  const [input, setInput] = useState(search);

  // Typed text goes up after a pause.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = input.trim();
      if (next !== search) onSearchChange(next);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, search, onSearchChange]);

  // A change that did not come from typing (filters cleared) shows in the box.
  useEffect(() => {
    setInput((current) => (current.trim() === search ? current : search));
  }, [search]);

  const safeCounts = counts || { all: 0, published: 0, draft: 0 };

  return (
    <Paper sx={{ p: 2, mb: 2, borderRadius: '12px' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
        <TextField
          fullWidth
          size="small"
          label="Search experiences"
          placeholder="Search by title..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          inputProps={{ maxLength: SEARCH_MAX_LENGTH }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" aria-hidden />
              </InputAdornment>
            ),
            endAdornment: input ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label="Clear search" onClick={() => setInput('')} edge="end">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <Tabs
          value={status}
          onChange={(_, value) => onStatusChange(value)}
          aria-label="Filter experiences by status"
          sx={{ minHeight: 40, flexShrink: 0 }}
        >
          <Tab value={EXPERIENCE_STATUS.ALL} label={`All (${safeCounts.all})`} sx={{ textTransform: 'none', minHeight: 40 }} />
          <Tab value={EXPERIENCE_STATUS.PUBLISHED} label={`Published (${safeCounts.published})`} sx={{ textTransform: 'none', minHeight: 40 }} />
          <Tab value={EXPERIENCE_STATUS.DRAFT} label={`Drafts (${safeCounts.draft})`} sx={{ textTransform: 'none', minHeight: 40 }} />
        </Tabs>
      </Stack>
    </Paper>
  );
};

export default ExperiencesFilters;
