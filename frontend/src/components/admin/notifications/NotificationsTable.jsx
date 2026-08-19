import React from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const STATUS_COLOR = {
  draft: 'default',
  scheduled: 'info',
  sending: 'warning',
  sent: 'success',
  failed: 'error',
  cancelled: 'default',
};

const NotificationsTable = ({
  rows = [],
  loading,
  typeLabels = {},
  onEdit,
  onPreview,
  onDuplicate,
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading notification campaigns" />
      </Box>
    );
  }

  if (!rows.length) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
          No notification campaigns yet
        </Typography>
      </Box>
    );
  }

  return (
    <Table aria-label="Notification campaigns">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Internal name</TableCell>
          <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Type</TableCell>
          <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Audience</TableCell>
          <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Languages</TableCell>
          <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Status</TableCell>
          <TableCell align="right" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
            Actions
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const languages = (row.localizations || []).map((item) => item.languageCode).join(', ');
          return (
            <TableRow key={row._id} hover>
              <TableCell>
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>
                  {row.internalName}
                </Typography>
              </TableCell>
              <TableCell sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                {typeLabels[row.type] || row.type}
              </TableCell>
              <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', textTransform: 'capitalize' }}>
                {row.audience}
              </TableCell>
              <TableCell sx={{ fontFamily: 'Quicksand, sans-serif' }}>{languages || '—'}</TableCell>
              <TableCell>
                <Chip size="small" label={row.status} color={STATUS_COLOR[row.status] || 'default'} />
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                  <Button size="small" onClick={() => onPreview?.(row)} sx={{ textTransform: 'none' }}>
                    Preview
                  </Button>
                  <Button
                    size="small"
                    onClick={() => onEdit?.(row)}
                    disabled={row.status !== 'draft'}
                    sx={{ textTransform: 'none' }}
                  >
                    Edit
                  </Button>
                  <Button size="small" onClick={() => onDuplicate?.(row)} sx={{ textTransform: 'none' }}>
                    Duplicate
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default NotificationsTable;
