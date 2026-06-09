import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Button,
  MenuItem,
  Pagination,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useSchoolProspects } from '../../../hooks/useSchoolProspects';

const langChip = (lang) => {
  const v = String(lang || '').toLowerCase();
  if (v === 'pt') return { label: 'PT', color: 'info' };
  if (v === 'es') return { label: 'ES', color: 'warning' };
  return { label: 'EN', color: 'default' };
};

const flodeskChip = (status) => {
  const v = String(status || '').toLowerCase();
  if (v === 'success') return { label: 'Flodesk OK', color: 'success' };
  if (v === 'failed') return { label: 'Flodesk failed', color: 'error' };
  return { label: 'Pending', color: 'default' };
};

const roleLabel = (role) => {
  const labels = {
    owner: 'Owner',
    principal: 'Principal',
    coordinator: 'Coordinator',
    teacher: 'Teacher',
  };
  return labels[String(role || '').toLowerCase()] || role || '—';
};

const DashboardSchoolProspectsList = ({ sx }) => {
  const theme = useTheme();
  const {
    items,
    meta,
    filters,
    loading,
    loadSchoolProspects,
    updateFilters,
    goToPage,
  } = useSchoolProspects();

  useEffect(() => {
    const id = setTimeout(() => {
      loadSchoolProspects();
    }, 250);
    return () => clearTimeout(id);
  }, [
    filters.q,
    filters.page,
    filters.limit,
    filters.language,
    filters.role,
    filters.flodeskStatus,
    loadSchoolProspects,
  ]);

  return (
    <Paper
      sx={{
        borderRadius: '16px',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.main}`,
        overflow: 'hidden',
        ...(sx || {}),
      }}
    >
      <Box sx={{ p: 3, pb: 2, borderBottom: `1px solid ${theme.palette.border.main}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                color: theme.palette.text.primary,
                fontSize: '1.1rem',
              }}
            >
              School Prospects
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
                fontSize: '0.875rem',
              }}
            >
              Schools page applications (newest first, 10 per page)
              {meta?.total != null ? ` • ${meta.total} total` : ''}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Language"
              value={filters.language}
              onChange={(e) => updateFilters({ language: e.target.value })}
              sx={{ minWidth: 110, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              inputProps={{ 'aria-label': 'Filter by language' }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="es">ES</MenuItem>
              <MenuItem value="pt">PT</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Role"
              value={filters.role}
              onChange={(e) => updateFilters({ role: e.target.value })}
              sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              inputProps={{ 'aria-label': 'Filter by role' }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="owner">Owner</MenuItem>
              <MenuItem value="principal">Principal</MenuItem>
              <MenuItem value="coordinator">Coordinator</MenuItem>
              <MenuItem value="teacher">Teacher</MenuItem>
            </TextField>

            <TextField
              size="small"
              value={filters.q}
              onChange={(e) => updateFilters({ q: e.target.value })}
              placeholder="Search school, email, city…"
              sx={{
                minWidth: { xs: '100%', sm: 280 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  fontFamily: 'Quicksand, sans-serif',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              inputProps={{ 'aria-label': 'Search school prospects' }}
            />
          </Box>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress size={24} sx={{ color: theme.palette.orange.main }} />
        </Box>
      ) : items.length === 0 ? (
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
            No school prospects to display.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {items.map((prospect) => {
              const lang = langChip(prospect.language);
              const flodesk = flodeskChip(prospect.flodeskStatus);
              const link = prospect.whatsappLink;

              return (
                <Box
                  key={prospect._id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    p: 2,
                    borderRadius: '14px',
                    border: `1px solid ${theme.palette.border.main}`,
                    backgroundColor: theme.palette.custom?.bgSecondary || 'rgba(0,0,0,0.02)',
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 700,
                          color: theme.palette.text.primary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: { xs: 240, sm: 360, md: 480 },
                        }}
                        title={prospect.schoolName}
                      >
                        {prospect.schoolName}
                      </Typography>
                      <Chip size="small" label={lang.label} color={lang.color} />
                      <Chip size="small" label={flodesk.label} color={flodesk.color} variant="outlined" />
                    </Box>

                    <Typography
                      sx={{
                        mt: 0.25,
                        fontFamily: 'Quicksand, sans-serif',
                        color: theme.palette.text.secondary,
                        fontSize: '0.9rem',
                        wordBreak: 'break-word',
                      }}
                    >
                      {prospect.email}
                      {prospect.cityCountry ? ` • ${prospect.cityCountry}` : ''}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,
                        fontFamily: 'Quicksand, sans-serif',
                        color: theme.palette.text.secondary,
                        fontSize: '0.85rem',
                      }}
                    >
                      {roleLabel(prospect.role)}
                      {prospect.studentCount ? ` • ${prospect.studentCount} students` : ''}
                      {prospect.ageGroup ? ` • Ages ${prospect.ageGroup}` : ''}
                      {prospect.currentEnglish
                        ? ` • English classes: ${prospect.currentEnglish === 'yes' ? 'Yes' : 'No'}`
                        : ''}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    {link ? (
                      <Button
                        component="a"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                        startIcon={<WhatsAppIcon />}
                        sx={{
                          textTransform: 'none',
                          borderRadius: '12px',
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 700,
                          backgroundColor: '#25D366',
                          '&:hover': { backgroundColor: '#1fb85a' },
                        }}
                        aria-label={`Open WhatsApp chat with ${prospect.schoolName}`}
                      >
                        WhatsApp
                      </Button>
                    ) : (
                      <Tooltip title="No WhatsApp number available">
                        <span>
                          <IconButton disabled aria-label="No WhatsApp">
                            <WhatsAppIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {meta?.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5 }}>
              <Pagination
                count={meta.totalPages}
                page={meta.page}
                onChange={(_, page) => goToPage(page)}
                color="primary"
                shape="rounded"
                aria-label="School prospects pagination"
              />
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default DashboardSchoolProspectsList;
