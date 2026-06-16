import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import AdminContentCreatorHeader from '../../components/admin/contentcreators/AdminContentCreatorHeader';
import AdminContentCreatorFilters from '../../components/admin/contentcreators/AdminContentCreatorFilters';
import AdminContentCreatorsTable from '../../components/admin/contentcreators/AdminContentCreatorsTable';
import AdminContentCreatorsPagination from '../../components/admin/contentcreators/AdminContentCreatorsPagination';
import AdminAddContentCreatorModal from '../../components/admin/contentcreators/AdminAddContentCreatorModal';
import useContentCreators from '../../hooks/contentCreatorsHook';

const AdminContentCreators = () => {
  const { fetchContentCreators } = useContentCreators();
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    fetchContentCreators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      <AdminContentCreatorHeader onAddClick={() => setAddModalOpen(true)} />
      <AdminContentCreatorFilters />
      <AdminContentCreatorsTable />
      <AdminContentCreatorsPagination />
      <AdminAddContentCreatorModal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          fetchContentCreators();
        }}
      />
    </Box>
  );
};

export default AdminContentCreators;
