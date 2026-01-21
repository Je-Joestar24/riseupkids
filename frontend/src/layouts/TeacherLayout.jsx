import React from 'react';
import { Box } from '@mui/material';
import TeacherNavigation from '../components/teacher/common/TeacherNavigation';
import TeacherSidebar, { DRAWER_WIDTH } from '../components/teacher/common/TeacherSidebar';

/**
 * TeacherLayout Component
 *
 * Layout wrapper for teacher pages
 * Includes navigation header and sidebar
 */
const TeacherLayout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Navigation Header */}
      <TeacherNavigation />

      {/* Sidebar */}
      <TeacherSidebar />

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

export default TeacherLayout;

