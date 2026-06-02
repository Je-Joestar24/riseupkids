import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Description } from '@mui/icons-material';
import PrintablesFilters from '../printables/PrintablesFilters';
import PrintablesModulesTable from '../printables/PrintablesModulesTable';
import PrintablesPagination from '../printables/PrintablesPagination';
import PrintablesDetailsPanel from '../printables/PrintablesDetailsPanel';
import useLessonPlanMaterials from '../../../hooks/lessonPlanMaterialsHook';

const LessonPlansWorkspace = ({ variant = 'page' }) => {
  const theme = useTheme();
  const isDashboard = variant === 'dashboard';

  const {
    modules,
    modulesPagination,
    course,
    courseLessonPlans,
    courseLessonPlansPagination,
    loadingModules,
    loadingCourseLessonPlans,
    addingLessonPlan,
    updatingLessonPlan,
    deletingLessonPlan,
    error,
    loadModules,
    loadCourseLessonPlans,
    createCourseLessonPlan,
    editCourseLessonPlan,
    requestDeleteCourseLessonPlan,
    clearCourseState,
  } = useLessonPlanMaterials();

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [moduleQuery, setModuleQuery] = useState({ page: 1, limit: isDashboard ? 5 : 10, search: '' });
  const [lessonPlanQuery, setLessonPlanQuery] = useState({ page: 1, limit: isDashboard ? 5 : 10, search: '' });

  useEffect(() => {
    loadModules(moduleQuery);
  }, [loadModules, moduleQuery]);

  useEffect(() => {
    if (!selectedCourse?.id) return;
    loadCourseLessonPlans(selectedCourse.id, lessonPlanQuery);
  }, [loadCourseLessonPlans, selectedCourse, lessonPlanQuery]);

  const isDetailsMode = Boolean(selectedCourse?.id);
  const totalModules = useMemo(
    () => modulesPagination?.total || modules?.length || 0,
    [modulesPagination, modules]
  );

  const handleSelectCourse = (module) => {
    setSelectedCourse(module);
    setLessonPlanQuery((prev) => ({ ...prev, page: 1 }));
  };

  const handleBackToTable = () => {
    setSelectedCourse(null);
    clearCourseState();
  };

  const handleAddLessonPlan = async (payload) => {
    if (!selectedCourse?.id) return;
    await createCourseLessonPlan(selectedCourse.id, payload);
    await loadCourseLessonPlans(selectedCourse.id, lessonPlanQuery);
    await loadModules(moduleQuery);
  };

  const handleRequestDeleteLessonPlan = (lessonPlan) => {
    if (!selectedCourse?.id) return;
    requestDeleteCourseLessonPlan({
      courseId: selectedCourse.id,
      lessonPlan,
      onDeleted: async () => {
        await loadCourseLessonPlans(selectedCourse.id, lessonPlanQuery);
        await loadModules(moduleQuery);
      },
    });
  };

  const handleEditLessonPlan = async (lessonPlanId, payload) => {
    if (!selectedCourse?.id || !lessonPlanId) return;
    await editCourseLessonPlan(selectedCourse.id, lessonPlanId, payload);
    await loadCourseLessonPlans(selectedCourse.id, lessonPlanQuery);
    await loadModules(moduleQuery);
  };

  return (
    <Box component="section" aria-label="Lesson plan materials management" sx={isDashboard ? { mt: 0 } : undefined}>
      <Paper
        sx={{
          p: isDashboard ? 2.5 : 3,
          mb: 2,
          borderRadius: '16px',
          border: `1px solid ${theme.palette.border.main}`,
          boxShadow: isDashboard ? theme.shadows[1] : theme.shadows[2],
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Description sx={{ color: theme.palette.orange.main }} aria-hidden />
          <Typography
            variant={isDashboard ? 'h5' : 'h4'}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: isDashboard ? { xs: '1.2rem', md: '1.35rem' } : { xs: '1.35rem', md: '1.75rem' },
            }}
          >
            Lesson Plans
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
          {selectedCourse
            ? `Managing lesson plans for "${selectedCourse.title}".`
            : `Manage teacher lesson plans per module. Total modules: ${totalModules}.`}
        </Typography>
      </Paper>

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
              printables={courseLessonPlans}
              pagination={courseLessonPlansPagination}
              loading={loadingCourseLessonPlans}
              adding={addingLessonPlan}
              updating={updatingLessonPlan}
              deleting={deletingLessonPlan}
              onAddPrintable={handleAddLessonPlan}
              onEditPrintable={handleEditLessonPlan}
              onDeletePrintable={handleRequestDeleteLessonPlan}
              onPageChange={(page) => setLessonPlanQuery((prev) => ({ ...prev, page }))}
              onLimitChange={(limit) => setLessonPlanQuery((prev) => ({ ...prev, limit, page: 1 }))}
              itemLabel="lesson plan"
              itemLabelPlural="lesson plans"
              sectionTitle="Lesson Plans"
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default LessonPlansWorkspace;
