import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { themeColors } from '../../config/themeColors';
import PrintablesHeader from '../../components/child/printables/PrintablesHeader';
import PrintablesCards from '../../components/child/printables/PrintablesCards';
import PrintablesFooter from '../../components/child/printables/PrintablesFooter';

/**
 * Child printable materials page (static layout for now).
 * Route: /child/:id/journey/:courseId/printables
 */
const ChildModulePrintables = () => {
    const navigate = useNavigate();
    const { id: childId, courseId } = useParams();

    const stepNumber = 3; // TODO: derive from backend/config when available

    const printables = useMemo(
        () => [
            {
                id: 'page-1',
                pageNumber: 1,
                label: 'ABC Tracing Worksheet',
                imageUrl:
                    'https://images.unsplash.com/photo-1580974928064-f0aeef70895a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
                fileUrl: 'https://example.com/printables/page-1.pdf',
            },
            {
                id: 'page-2',
                pageNumber: 2,
                label: 'Letter Recognition Practice',
                imageUrl:
                    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
                fileUrl: 'https://example.com/printables/page-2.pdf',
            },
            {
                id: 'page-3',
                pageNumber: 3,
                label: 'Coloring Activity',
                imageUrl:
                    'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
                fileUrl: 'https://example.com/printables/page-3.pdf',
            },
        ],
        []
    );

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

                <PrintablesCards cards={printables} onDownload={handleDownload} />

                <Box sx={{ mt: 4 }}>
                    <PrintablesFooter />
                </Box>
            </Box>
        </Box>
    );
};

export default ChildModulePrintables;

