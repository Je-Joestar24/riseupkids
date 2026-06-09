import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Description } from '@mui/icons-material';
import PrintablesHeader from './PrintablesHeader';
import PrintablesFilters from './PrintablesFilters';
import PrintablesModulesTable from './PrintablesModulesTable';
import PrintablesPagination from './PrintablesPagination';
import PrintablesDetailsPanel from './PrintablesDetailsPanel';
import usePrintableMaterials from '../../../hooks/printableMaterialsHook';

/**
 * Shared printable materials manager (modules table + per-module printables).
 * Used on the full printables page and embedded on the teacher dashboard.
 */
const PrintablesWorkspace = ({ variant = 'page' }) => {
  const theme = useTheme();
  const isDashboard = variant === 'dashboard';

  const {
    modules,
    modulesPagination,
    course,
    coursePrintables,
    coursePrintablesPagination,
    loadingModules,
    loadingCoursePrintables,
    addingPrintable,
    updatingPrintable,
    deletingPrintable,
    error,
    loadModules,
    loadCoursePrintables,
    createCoursePrintable,
    editCoursePrintable,
    requestDeleteCoursePrintable,
    clearCourseState,
  } = usePrintableMaterials();

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [moduleQuery, setModuleQuery] = useState({
    page: 1,
    limit: isDashboard ? 5 : 10,
    search: '',
    isPublished: undefined,
  });
  const [printableQuery, setPrintableQuery] = useState({
    page: 1,
    limit: isDashboard ? 5 : 10,
    search: '',
  });

  useEffect(() => {
    loadModules(moduleQuery);
  }, [loadModules, moduleQuery]);

  useEffect(() => {
    if (!selectedCourse?.id) return;
    loadCoursePrintables(selectedCourse.id, printableQuery);
  }, [loadCoursePrintables, selectedCourse, printableQuery]);

  const isDetailsMode = Boolean(selectedCourse?.id);
  const totalModules = useMemo(
    () => modulesPagination?.total || modules?.length || 0,
    [modulesPagination, modules]
  );

  const handleSelectCourse = (module) => {
    setSelectedCourse(module);
    setPrintableQuery((prev) => ({ ...prev, page: 1 }));
  };

  useEffect(() => {
    if (!selectedCourse?.id || !course?.id) return;
    if (String(course.id) !== String(selectedCourse.id)) return;
    if (course.isPublished === selectedCourse.isPublished) return;
    setSelectedCourse((prev) => (prev ? { ...prev, isPublished: course.isPublished } : prev));
  }, [course, selectedCourse?.id, selectedCourse?.isPublished]);

  const handleBackToTable = () => {
    setSelectedCourse(null);
    clearCourseState();
  };

  const handleAddPrintable = async (payload) => {
    if (!selectedCourse?.id) return;
    await createCoursePrintable(selectedCourse.id, payload);
    await loadCoursePrintables(selectedCourse.id, printableQuery);
    await loadModules(moduleQuery);
  };

  const handleRequestDeletePrintable = (printable) => {
    if (!selectedCourse?.id) return;
    requestDeleteCoursePrintable({
      courseId: selectedCourse.id,
      printable,
      onDeleted: async () => {
        await loadCoursePrintables(selectedCourse.id, printableQuery);
        await loadModules(moduleQuery);
      },
    });
  };

  const handleEditPrintable = async (printableId, payload) => {
    if (!selectedCourse?.id || !printableId) return;
    await editCoursePrintable(selectedCourse.id, printableId, payload);
    await loadCoursePrintables(selectedCourse.id, printableQuery);
    await loadModules(moduleQuery);
  };

  return (
    <Box
      component="section"
      aria-label="Printable materials management"
      sx={isDashboard ? { mt: 0 } : undefined}
    >
      {isDashboard ? (
        <Paper
          sx={{
            p: 2.5,
            mb: 2,
            borderRadius: '16px',
            border: `1px solid ${theme.palette.border.main}`,
            boxShadow: theme.shadows[1],
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Description sx={{ color: theme.palette.orange.main }} aria-hidden />
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: { xs: '1.2rem', md: '1.35rem' },
              }}
            >
              Printable Materials
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
            }}
          >
            {selectedCourse
              ? `Managing printables for "${selectedCourse.title}"${selectedCourse.isPublished === false ? ' (draft)' : ''}. Select another module in the table to switch.`
              : `Upload and manage PDF printables per module, including drafts before publishing. ${totalModules} module${totalModules === 1 ? '' : 's'} available.`}
          </Typography>
        </Paper>
      ) : (
        <PrintablesHeader
          selectedCourse={selectedCourse}
          totalModules={totalModules}
          onBackToTable={handleBackToTable}
        />
      )}

      <PrintablesFilters
        search={moduleQuery.search}
        isPublished={moduleQuery.isPublished}
        placeholder="Search modules by title or description..."
        onSearchChange={(search) => setModuleQuery((prev) => ({ ...prev, search, page: 1 }))}
        onPublishedChange={(isPublished) => setModuleQuery((prev) => ({ ...prev, isPublished, page: 1 }))}
        onClear={() =>
          setModuleQuery((prev) => ({ ...prev, search: '', isPublished: undefined, page: 1 }))
        }
      />

      {error ? (
        <Paper sx={{ p: 2, mb: 2, borderRadius: '12px', backgroundColor: 'error.light' }}>
          <Typography sx={{ fontWeight: 600 }}>{String(error)}</Typography>
        </Paper>
      ) : null}

      {isDashboard && isDetailsMode ? (
        <Box sx={{ mb: 2 }}>
          <Typography
            component="button"
            type="button"
            onClick={handleBackToTable}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              color: theme.palette.orange.dark,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.875rem',
            }}
            aria-label="Back to all modules"
          >
            ← Back to all modules
          </Typography>
        </Box>
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
          <Grid item xs={12} md={isDashboard ? 12 : 7} lg={7}>
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
          <Grid item xs={12} md={isDashboard ? 12 : 5} lg={5}>
            <PrintablesDetailsPanel
              course={course || selectedCourse}
              printables={coursePrintables}
              pagination={coursePrintablesPagination}
              loading={loadingCoursePrintables}
              adding={addingPrintable}
              updating={updatingPrintable}
              deleting={deletingPrintable}
              onAddPrintable={handleAddPrintable}
              onEditPrintable={handleEditPrintable}
              onDeletePrintable={handleRequestDeletePrintable}
              onPageChange={(page) => setPrintableQuery((prev) => ({ ...prev, page }))}
              onLimitChange={(limit) => setPrintableQuery((prev) => ({ ...prev, limit, page: 1 }))}
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default PrintablesWorkspace;
