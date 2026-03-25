import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Stack,
} from '@mui/material';

import useChildren from '../../hooks/childrenHook';
import { themeColors } from '../../config/themeColors';
import programMaterilialsService from '../../services/programMaterilialsService';
import ProgramMaterialsHeader from '../../components/parents/program/ProgramMaterialsHeader';
import ProgramMaterialsChildSelector from '../../components/parents/program/ProgramMaterialsChildSelector';
import ProgramMaterialsStepList from '../../components/parents/program/ProgramMaterialsStepList';

const SELECTED_CHILD_KEY = 'programMaterialsSelectedChildId';

const ParentsDashboardPrintableTab = () => {
  const { children, loading: childrenLoading, fetchChildren } = useChildren();
  const [selectedChildId, setSelectedChildId] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchChildren({ isActive: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!children.length) return;

    const savedChildId = sessionStorage.getItem(SELECTED_CHILD_KEY);
    const exists = savedChildId && children.some((child) => child?._id === savedChildId);
    const defaultChildId = exists ? savedChildId : children[0]?._id;

    if (defaultChildId) {
      setSelectedChildId(defaultChildId);
    }
  }, [children]);

  useEffect(() => {
    if (!selectedChildId) return;

    const loadMaterials = async () => {
      setError('');
      setLoadingMaterials(true);
      try {
        const data = await programMaterilialsService.getByChildId(selectedChildId);
        const modules = Array.isArray(data?.unlocking?.modules)
          ? data.unlocking.modules
          : (Array.isArray(data?.materialsByStep) ? data.materialsByStep : []);
        setMaterials(modules);
      } catch (err) {
        setMaterials([]);
        setError(typeof err === 'string' ? err : 'Failed to load printable materials');
      } finally {
        setLoadingMaterials(false);
      }
    };

    loadMaterials();
  }, [selectedChildId]);

  const selectedChild = useMemo(
    () => children.find((child) => child?._id === selectedChildId) || null,
    [children, selectedChildId]
  );

  const handleChildChange = (event) => {
    const childId = event.target.value;
    setSelectedChildId(childId);
    sessionStorage.setItem(SELECTED_CHILD_KEY, childId);
  };

  const handleDownload = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: themeColors.bg,
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2 } }}>
        <Stack spacing={2}>
          <ProgramMaterialsHeader childName={selectedChild?.displayName} />

          <ProgramMaterialsChildSelector
            children={children}
            selectedChildId={selectedChildId}
            onChange={handleChildChange}
            disabled={childrenLoading || !children.length}
          />

          {error ? <Alert severity="error">{error}</Alert> : null}

          {loadingMaterials ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={30} />
            </Box>
          ) : (
            !error && (
              <ProgramMaterialsStepList materials={materials} onDownload={handleDownload} />
            )
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default ParentsDashboardPrintableTab;
