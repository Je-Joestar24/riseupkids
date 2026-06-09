import React, { useEffect, useMemo, useState } from 'react';
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
  Pagination,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import adminDashboardService from '../../../services/adminDashboardService';

function normalizeWhatsAppPhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

function getFirstName(parentName) {
  if (!parentName) return '';
  return String(parentName).trim().split(/\s+/)[0] || '';
}

function buildWhatsAppMessage({ name, language }) {
  const firstName = getFirstName(name) || '';
  const lang = String(language || '').trim().toLowerCase();
  // Avoid broken emojis when file is saved in a non-UTF8 encoding on Windows editors.

  if (lang === 'pt') {
    return `Olá ${firstName}! Aqui é a Viviana do Rise Up Kids\nVi que você se registrou para saber mais sobre o programa e queria saber se você tem alguma pergunta. Ficarei feliz em ajudar!`;
  }
  if (lang === 'es') {
    return `Hola ${firstName}! Soy Viviana de Rise Up Kids\nVi que te registraste para saber más sobre el programa y quería saber si tienes alguna pregunta. ¡Con gusto puedo ayudarte!`;
  }
  return `Hi ${firstName}! This is Viviana from Rise Up Kids\nI saw that you registered to learn more about the program and wanted to see if you have any questions. I'd be happy to help!`;
}

function buildWhatsAppLink({ whatsapp, name, language }) {
  const phone = normalizeWhatsAppPhone(whatsapp);
  if (!phone) return null;
  const message = buildWhatsAppMessage({ name, language });
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

const langChip = (lang) => {
  const v = String(lang || '').toLowerCase();
  if (v === 'pt') return { label: 'PT', color: 'info' };
  if (v === 'es') return { label: 'ES', color: 'warning' };
  return { label: 'EN', color: 'default' };
};

const DASHBOARD_LEADS_LIMIT = 10;

const DashboardLeadsList = ({ sx }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    let cancelled = false;

    const fetchLeads = async () => {
      setLoading(true);
      try {
        const response = await adminDashboardService.getLeads({
          page,
          limit: DASHBOARD_LEADS_LIMIT,
          q: q || undefined,
        });
        if (cancelled) return;
        setItems(response.data?.items || []);
        setMeta(response.data?.meta || null);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load leads:', error);
          setItems([]);
          setMeta(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const id = setTimeout(fetchLeads, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, page]);

  const rows = useMemo(() => {
    return (items || []).map((lead) => {
      const link = buildWhatsAppLink({
        whatsapp: lead.whatsapp,
        name: lead.parentName,
        language: lead.language,
      });
      return { lead, link };
    });
  }, [items]);

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
              Leads
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
                fontSize: '0.875rem',
              }}
            >
              Sales page invitations (newest first, {DASHBOARD_LEADS_LIMIT} per page)
              {meta?.total != null ? ` • ${meta.total} total` : ''}
            </Typography>
          </Box>

          <TextField
            size="small"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, or WhatsApp…"
            sx={{
              minWidth: { xs: '100%', sm: 360 },
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
            inputProps={{ 'aria-label': 'Search leads' }}
          />
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress size={24} sx={{ color: theme.palette.orange.main }} />
        </Box>
      ) : rows.length === 0 ? (
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
            No leads to display.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {rows.map(({ lead, link }) => {
              const chip = langChip(lead.language);
              const cleaned = normalizeWhatsAppPhone(lead.whatsapp);

              return (
                <Box
                  key={lead._id}
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
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 700,
                          color: theme.palette.text.primary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: { xs: 240, sm: 360, md: 520 },
                        }}
                        title={lead.parentName}
                      >
                        {lead.parentName}
                      </Typography>
                      <Chip size="small" label={chip.label} color={chip.color} />
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
                      {lead.email}
                      {lead.whatsapp ? ` • ${cleaned || lead.whatsapp}` : ''}
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
                        aria-label="Open WhatsApp chat"
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
                onChange={(_, nextPage) => setPage(nextPage)}
                color="primary"
                shape="rounded"
                aria-label="Leads pagination"
              />
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default DashboardLeadsList;

