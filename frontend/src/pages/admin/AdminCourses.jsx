import React, { useState } from 'react';
import { Box } from '@mui/material';
import CourseList from '../../components/admin/courses/course/CourseList';
import CourseAddModal from '../../components/admin/courses/course/CourseAddModal';

/**
 * AdminCourses Page
 *
 * Main page for managing course/content collections
 * Displays course list with filters, pagination, and add functionality
 */
const AdminCourses = () => {
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleAddClick = () => {
    setAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setAddModalOpen(false);
  };

  const handleAddSuccess = () => {
    setAddModalOpen(false);
    // CourseList will automatically refresh via useEffect
  };

  return (
    <Box
      sx={{
        padding: 3,
        minHeight: '100vh',
        backgroundColor: 'transparent',
      }}
    >
      <CourseList onAddClick={handleAddClick} />
      
      {/* Add Course Modal */}
      <CourseAddModal
        open={addModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleAddSuccess}
      />
    </Box>
  );
};

export default AdminCourses;

