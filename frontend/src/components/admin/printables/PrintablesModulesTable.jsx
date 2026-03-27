import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const PrintablesModulesTable = ({ modules, loading, onViewModule }) => {
  const theme = useTheme();

  if (loading && (!modules || modules.length === 0)) {
    return (
      <Paper sx={{ p: 4, borderRadius: '12px', textAlign: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (!modules || modules.length === 0) {
    return (
      <Paper sx={{ p: 4, borderRadius: '12px', textAlign: 'center' }}>
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
          No modules found.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: '12px',
        border: `1px solid ${theme.palette.border.main}`,
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Printables</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {modules.map((module) => (
            <TableRow key={module.id} hover>
              <TableCell>{module.stepNumber}</TableCell>
              <TableCell>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{module.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {module.description || 'No description'}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>{module.printableCount || 0}</TableCell>
              <TableCell align="right">
                <Button
                  variant="contained"
                  onClick={() => onViewModule(module)}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontFamily: 'Quicksand, sans-serif',
                  }}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PrintablesModulesTable;

