import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Stack, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add as AddIcon } from '@mui/icons-material';
import ActivityHeader from '../../components/admin/courses/activity/ActivityHeader';
import ActivityFilters from '../../components/admin/courses/activity/ActivityFilters';
import ActivityItems from '../../components/admin/courses/activity/ActivityItems';
import ActivityPaginations from '../../components/admin/courses/activity/ActivityPaginations';
import ActivityAddModal from '../../components/admin/courses/activity/ActivityAddModal';
import useActivity from '../../hooks/activityHook';

/**
 * AdminActivities Page
 * 
 * Main page for managing activities
 */
const AdminActivities = () => {
  const theme = useTheme();
  const { fetchActivities, loading, pagination } = useActivity();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { filters } = useActivity();

  // Fetch activities on component mount and when filters change
  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.isPublished, filters.search, filters.page]);

  const handleAddClick = () => {
    setAddModalOpen(true);
  };

  const handleModalClose = () => {
    setAddModalOpen(false);
  };

  const handleActivityCreated = () => {
    setAddModalOpen(false);
    fetchActivities();
  };

  return (
    <Box>
      {/* Header Section */}
      <ActivityHeader onAddClick={handleAddClick} />

      {/* Filters Section */}
      <ActivityFilters />

      {/* Activities List */}
      <ActivityItems loading={loading} />

      {/* Pagination */}
      <ActivityPaginations pagination={pagination} />

      {/* Add Activity Modal */}
      <ActivityAddModal
        open={addModalOpen}
        onClose={handleModalClose}
        onSuccess={handleActivityCreated}
      />
    </Box>
  );
};

export default AdminActivities;

