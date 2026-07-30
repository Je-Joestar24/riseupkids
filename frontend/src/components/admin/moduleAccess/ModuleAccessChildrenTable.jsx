import React from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Box,
  Chip,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const ModuleAccessChildrenTable = ({ rows = [], loading, onManage }) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!rows.length) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
          }}
        >
          No children found
        </Typography>
      </Box>
    );
  }

  return (
    <Table aria-label="Children module access">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Child</TableCell>
          <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Parent</TableCell>
          <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Active module</TableCell>
          <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Progress</TableCell>
          <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Overrides</TableCell>
          <TableCell align="right" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
            Actions
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const summary = row.summary || {};
          return (
            <TableRow key={row._id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar src={row.avatar || undefined} alt={row.displayName || 'Child'}>
                    {(row.displayName || '?').charAt(0)}
                  </Avatar>
                  <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>
                    {row.displayName || 'Unnamed'}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '0.875rem' }}>
                  {row.parent?.name || '—'}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '0.75rem',
                    color: theme.palette.text.secondary,
                  }}
                >
                  {row.parent?.email || ''}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '0.875rem' }}>
                  {summary.activeModule?.title || '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '0.875rem' }}>
                  {summary.completedCount ?? 0}/{summary.totalModules ?? 0} completed
                </Typography>
              </TableCell>
              <TableCell>
                {summary.hasOverrides ? (
                  <Chip
                    size="small"
                    label={`${summary.overrideCount} override${summary.overrideCount === 1 ? '' : 's'}`}
                    color="warning"
                    sx={{ fontFamily: 'Quicksand, sans-serif' }}
                  />
                ) : (
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontSize: '0.875rem',
                      color: theme.palette.text.secondary,
                    }}
                  >
                    None
                  </Typography>
                )}
              </TableCell>
              <TableCell align="right">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onManage?.(row)}
                  aria-label={`Manage modules for ${row.displayName || 'child'}`}
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    textTransform: 'none',
                    borderRadius: '8px',
                  }}
                >
                  Manage
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default ModuleAccessChildrenTable;
