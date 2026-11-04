import React, { useMemo } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import PrintablesHeader from '../../components/child/printables/PrintablesHeader';
import PrintablesCards from '../../components/child/printables/PrintablesCards';
import PrintablesFooter from '../../components/child/printables/PrintablesFooter';
import PrintablesSkeleton from '../../components/child/printables/PrintablesSkeleton';
import programMaterilialsService from '../../services/programMaterilialsService';
import { useCachedLoad } from '../../hooks/useCachedLoad';
import { CHILD_PAGE_NAV_CLEARANCE } from '../../constants/childNavigationLayout';

/**
 * Child printable materials page.
 * Route: /child/:id/journey/:courseId/printables
 *
 * The materials are kept per child for the session: only a first visit shows the placeholder, later
 * visits draw the last list at once and replace it when the refresh arrives (a failed refresh behind a
 * real list stays silent).
 */
const ChildModulePrintables = () => {
    const navigate = useNavigate();
    const { id: childId, courseId } = useParams();

    const numericCourseId = Number(courseId);

    const { data: materials = null, loaded, error: loadError, refresh } = useCachedLoad(
        childId ? `${childId}:printables` : null,
        async () => {
            try {
                return await programMaterilialsService.getByChildId(childId);
            } catch (err) {
                throw new Error(typeof err === 'string' ? err : 'Failed to load printables.');
            }
        }
    );
    const error = childId ? loadError : 'Child ID is missing.';
    const loading = Boolean(childId) && !loaded && !error;

    const selectedModule = useMemo(() => {
        const modules = Array.isArray(materials?.modules) ? materials.modules : [];
        if (!modules.length) return null;

        return (
            modules.find((module) => String(module?.id) === String(courseId)) ||
            (Number.isFinite(numericCourseId) ? modules.find((module) => module?.stepNumber === numericCourseId) : null) ||
            modules[0]
        );
    }, [materials, courseId, numericCourseId]);

    const stepNumber = selectedModule?.stepNumber || (Number.isFinite(numericCourseId) ? numericCourseId : 1);

    const printables = useMemo(() => {
        const source = Array.isArray(selectedModule?.printables) ? selectedModule.printables : [];
        return source.map((item, index) => ({
            id: item?.id || `page-${index + 1}`,
            pageNumber: item?.pageNumber || index + 1,
            title: item?.title || item?.label || `Printable ${index + 1}`,
            description: item?.description || item?.details || '',
            imageUrl: item?.coverImage || null,
            fileUrl: item?.fileUrl || item?.pdfUrl || null,
        }));
    }, [selectedModule]);

    const handleBack = () => {
        navigate(`/child/${childId}/journey/${courseId}`);
    };

    const handleDownload = (url) => {
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                backgroundColor: 'rgb(212, 230, 227)',
                paddingBottom: CHILD_PAGE_NAV_CLEARANCE,
                px: { xs: 2, sm: 3 },
                py: 4,
                display: 'flex',
                justifyContent: 'center',
            }}
        >
            <Box sx={{
                width: '100%',
                maxWidth: '848px'
            }}>
                <Box sx={{ mb: { xs: 3, sm: 4, md: 5 } }}>
                    <PrintablesHeader onBack={handleBack} stepNumber={stepNumber} />
                </Box>

                {loading ? (
                    <PrintablesSkeleton />
                ) : error ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography
                            role="alert"
                            aria-label="Printable loading error"
                            sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, color: '#b91c1c' }}
                        >
                            {error}
                        </Typography>
                        {childId && (
                            <Button
                                variant="contained"
                                onClick={() => refresh().catch(() => {})}
                                aria-label="Retry loading printables"
                                sx={{
                                    alignSelf: 'flex-start',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontFamily: 'Quicksand, sans-serif',
                                }}
                            >
                                Retry
                            </Button>
                        )}
                    </Box>
                ) : (
                    <PrintablesCards cards={printables} onDownload={handleDownload} />
                )}

                <Box sx={{ mt: 4 }}>
                    <PrintablesFooter />
                </Box>
            </Box>
        </Box>
    );
};

export default ChildModulePrintables;
