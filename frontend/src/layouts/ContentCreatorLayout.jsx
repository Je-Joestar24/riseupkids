import React, { useState } from 'react';
import { Box } from '@mui/material';
import ContentCreatorSidebar, { DRAWER_WIDTH } from '../components/contentcreator/common/ContentCreatorSidebar';
import TeacherNavigation from '../components/teacher/common/TeacherNavigation';
import AdminProfileDrawer from '../components/admin/common/AdminProfileDrawer';
import { useAuth } from '..//hooks/userHook';

const ContentCreatorLayout = ({ children }) => {
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <TeacherNavigation profileDrawerOpen={profileDrawerOpen} setProfileDrawerOpen={setProfileDrawerOpen} />
      <ContentCreatorSidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: 3,
          marginTop: '64px',
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
      <AdminProfileDrawer
        open={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        onLogout={logout}
      />
    </Box>
  );
};

export default ContentCreatorLayout;
