import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import PrintablesHeader from '../../components/admin/printables/PrintablesHeader';
import PrintablesFilters from '../../components/admin/printables/PrintablesFilters';
import PrintablesModulesTable from '../../components/admin/printables/PrintablesModulesTable';
import PrintablesPagination from '../../components/admin/printables/PrintablesPagination';
import PrintablesDetailsPanel from '../../components/admin/printables/PrintablesDetailsPanel';
import usePrintableMaterials from '../../hooks/printableMaterialsHook';

/**
 * Admin Printables Page
 *
 * Mode 1 (default): full width modules table
 * Mode 2 (when selected): two columns (left modules + right printables list)
 */
const AdminPrintables = () => {
  const {
    modules,
    modulesPagination,
    course,
    coursePrintables,
    coursePrintablesPagination,
    loadingModules,
    loadingCoursePrintables,
    addingPrintable,
    error,
    loadModules,
    loadCoursePrintables,
    createCoursePrintable,
    clearCourseState,
  } = usePrintableMaterials();

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [moduleQuery, setModuleQuery] = useState({ page: 1, limit: 10, search: '' });
  const [printableQuery, setPrintableQuery] = useState({ page: 1, limit: 10, search: '' });

  useEffect(() => {
    loadModules(moduleQuery);
  }, [loadModules, moduleQuery]);

  useEffect(() => {
    if (!selectedCourse?.id) return;
    loadCoursePrintables(selectedCourse.id, printableQuery);
  }, [loadCoursePrintables, selectedCourse, printableQuery]);

  const isDetailsMode = Boolean(selectedCourse?.id);

  const totalModules = useMemo(() => modulesPagination?.total || modules?.length || 0, [modulesPagination, modules]);

  const handleSelectCourse = (module) => {
    setSelectedCourse(module);
    setPrintableQuery((prev) => ({ ...prev, page: 1 }));
  };

  const handleBackToTable = () => {
    setSelectedCourse(null);
    clearCourseState();
  };

  const handleAddPrintable = async (payload) => {
    if (!selectedCourse?.id) return;
    await createCoursePrintable(selectedCourse.id, payload);
    await loadCoursePrintables(selectedCourse.id, printableQuery);
    await loadModules(moduleQuery); // refresh counts on left table
  };

  return (
    <Box
      sx={{
        p: 3,
        minHeight: '100vh',
      }}
    >
      <PrintablesHeader
        selectedCourse={selectedCourse}
        totalModules={totalModules}
        onBackToTable={handleBackToTable}
      />

      <PrintablesFilters
        search={moduleQuery.search}
        placeholder="Search modules by title or description..."
        onSearchChange={(search) => setModuleQuery((prev) => ({ ...prev, search, page: 1 }))}
        onClear={() => setModuleQuery((prev) => ({ ...prev, search: '', page: 1 }))}
      />

      {error ? (
        <Paper sx={{ p: 2, mb: 2, borderRadius: '12px', backgroundColor: 'error.light' }}>
          <Typography sx={{ fontWeight: 600 }}>{String(error)}</Typography>
        </Paper>
      ) : null}

      {!isDetailsMode ? (
        <Box>
          <PrintablesModulesTable
            modules={modules}
            loading={loadingModules}
            selectedModuleId={selectedCourse?.id || null}
            onSelectModule={handleSelectCourse}
          />
          <PrintablesPagination
            pagination={modulesPagination}
            onPageChange={(page) => setModuleQuery((prev) => ({ ...prev, page }))}
            onLimitChange={(limit) => setModuleQuery((prev) => ({ ...prev, limit, page: 1 }))}
            itemLabel="modules"
          />
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <PrintablesModulesTable
              modules={modules}
              loading={loadingModules}
              selectedModuleId={selectedCourse?.id || null}
              onSelectModule={handleSelectCourse}
            />
            <PrintablesPagination
              pagination={modulesPagination}
              onPageChange={(page) => setModuleQuery((prev) => ({ ...prev, page }))}
              onLimitChange={(limit) => setModuleQuery((prev) => ({ ...prev, limit, page: 1 }))}
              itemLabel="modules"
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <PrintablesDetailsPanel
              course={course || selectedCourse}
              printables={coursePrintables}
              pagination={coursePrintablesPagination}
              loading={loadingCoursePrintables}
              adding={addingPrintable}
              onAddPrintable={handleAddPrintable}
              onPageChange={(page) => setPrintableQuery((prev) => ({ ...prev, page }))}
              onLimitChange={(limit) => setPrintableQuery((prev) => ({ ...prev, limit, page: 1 }))}
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AdminPrintables;

