import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildModuleBreadCrumbs Component
 * 
 * Breadcrumb navigation for course detail page
 * Shows "My Journey" button and current step/week
 */
const ChildModuleBreadCrumbs = ({ stepNumber, onJourneyClick }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '24px',
                flexWrap: 'wrap',
                width: '100%',
            }}
        >
            {/* My Journey Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                    onClick={onJourneyClick}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px', // y 8px, x 16px
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        color: themeColors.secondary, // rgb(98, 202, 202)
                        fontSize: '16px',
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        borderRadius: '0px',
                        transition: 'all 0.2s',
                        '&:hover': {
                            backgroundColor: themeColors.textInverse, // white
                            transform: 'scale(1.05)',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        },
                        '&:active': {
                            transform: 'scale(0.95)',
                        },
                    }}
                >
                    <span style={{ fontSize: '20px' }}>🗺️</span>
                    <Typography
                        sx={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: themeColors.secondary,
                        }}
                    >
                        My Journey
                    </Typography>
                </Button>

                {/* Chevron Right Separator */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                    aria-hidden="true"
                >
                    <path d="m9 18 6-6-6-6"></path>
                </svg>
            </Box>

            {/* Step/Week Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px', // y 8px, x 16px
                        backgroundColor: themeColors.secondary, // rgb(98, 202, 202)
                        color: themeColors.textInverse, // white
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    <span style={{ fontSize: '20px' }}>📚</span>
                    <Typography
                        sx={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: themeColors.textInverse, // white
                        }}
                    >
                        Step {stepNumber}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default ChildModuleBreadCrumbs;
