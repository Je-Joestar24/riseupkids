import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import PrintablesHeader from '../../components/child/printables/PrintablesHeader';
import PrintablesCards from '../../components/child/printables/PrintablesCards';
import PrintablesFooter from '../../components/child/printables/PrintablesFooter';
import programMaterilialsService from '../../services/programMaterilialsService';
import { CHILD_PAGE_NAV_CLEARANCE } from '../../constants/childNavigationLayout';

/**
 * Child printable materials page.
 * Route: /child/:id/journey/:courseId/printables
 */
const ChildModulePrintables = () => {
    const navigate = useNavigate();
    const { id: childId, courseId } = useParams();
    const [materials, setMaterials] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const numericCourseId = Number(courseId);

    const fetchMaterials = async () => {
        if (!childId) {
            setError('Child ID is missing.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await programMaterilialsService.getByChildId(childId);
            setMaterials(response);
        } catch (err) {
            setError(typeof err === 'string' ? err : 'Failed to load printables.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMaterials();
    }, [childId]);

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
                    <Typography
                        role="status"
                        aria-label="Loading printables"
                        sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}
                    >
                        Loading printables...
                    </Typography>
                ) : error ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography
                            role="alert"
                            aria-label="Printable loading error"
                            sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, color: '#b91c1c' }}
                        >
                            {error}
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={fetchMaterials}
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

