import React from 'react';
import { Box } from '@mui/material';
import LessonPlansWorkspace from '../../components/admin/lessonplans/LessonPlansWorkspace';

const AdminLessonPlans = () => (
  <Box sx={{ p: 3, minHeight: '100vh' }}>
    <LessonPlansWorkspace variant="page" />
  </Box>
);

export default AdminLessonPlans;
