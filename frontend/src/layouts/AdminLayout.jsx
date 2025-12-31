import React from 'react';
import { Box } from '@mui/material';
import AdminNavigation from '../components/admin/common/AdminNavigation';
import AdminSidebar, { DRAWER_WIDTH } from '../components/admin/common/AdminSidebar';

/**
 * AdminLayout Component
 * 
 * Layout wrapper for admin pages
 * Includes navigation header and sidebar
 */
const AdminLayout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Navigation Header */}
      <AdminNavigation />

      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: 3,
          marginTop: '64px',
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          backgroundColor: '#f8fafc',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default AdminLayout;

