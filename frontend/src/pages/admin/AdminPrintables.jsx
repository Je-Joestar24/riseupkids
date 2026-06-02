import React from 'react';
import { Box } from '@mui/material';
import PrintablesWorkspace from '../../components/admin/printables/PrintablesWorkspace';

/**
 * Admin Printables Page — full-page printable materials manager.
 */
const AdminPrintables = () => (
  <Box
    sx={{
      p: 3,
      minHeight: '100vh',
    }}
  >
    <PrintablesWorkspace variant="page" />
  </Box>
);

export default AdminPrintables;
