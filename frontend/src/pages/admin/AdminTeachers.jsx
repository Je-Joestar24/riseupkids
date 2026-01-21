import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import AdminTeacherHeader from '../../components/admin/teachers/AdminTeacherHeader';
import AdminTeacherFilters from '../../components/admin/teachers/AdminTeacherFilters';
import AdminTeachersTable from '../../components/admin/teachers/AdminTeachersTable';
import AdminTeachersPagination from '../../components/admin/teachers/AdminTeachersPagination';
import AdminAddTeacherModal from '../../components/admin/teachers/AdminAddTeacherModal';
import useTeachers from '../../hooks/teachersHook';

/**
 * AdminTeachers Page
 *
 * Main page for managing teacher accounts (admin only)
 */
const AdminTeachers = () => {
  const { fetchTeachers } = useTeachers();
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    fetchTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      <AdminTeacherHeader onAddClick={() => setAddModalOpen(true)} />

      <AdminTeacherFilters />
      <AdminTeachersTable />
      <AdminTeachersPagination />

      <AdminAddTeacherModal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          fetchTeachers();
        }}
      />
    </Box>
  );
};

export default AdminTeachers;

