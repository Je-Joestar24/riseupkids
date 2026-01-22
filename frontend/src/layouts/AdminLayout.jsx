import React, { useState } from 'react';
import { Box } from '@mui/material';
import AdminNavigation from '../components/admin/common/AdminNavigation';
import AdminSidebar, { DRAWER_WIDTH } from '../components/admin/common/AdminSidebar';
import AdminProfileDrawer from '../components/admin/common/AdminProfileDrawer';
import { useAuth } from '../hooks/userHook';

/**
 * AdminLayout Component
 * 
 * Layout wrapper for admin pages
 * Includes navigation header and sidebar
 */
const AdminLayout = ({ children }) => {
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const { logout } = useAuth();
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Navigation Header */}
      <AdminNavigation profileDrawerOpen={profileDrawerOpen} setProfileDrawerOpen={setProfileDrawerOpen} />

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

      {/* Profile Drawer */}
      <AdminProfileDrawer
        open={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        onLogout={logout}
      />
    </Box>
  );
};

export default AdminLayout;

