import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { themeColors } from '../../../config/themeColors';
import { useExploreVideoWatch } from '../../../hooks/exploreVideoWatchHook';

/**
 * Arrow Left SVG Icon
 */
const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 19-7-7 7-7"></path>
        <path d="M19 12H5"></path>
    </svg>
);

/**
 * Star SVG Icon (filled)
 */
const StarIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={themeColors.accent}
        stroke={themeColors.accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
    </svg>
);

/**
 * ExploreReplaysHeader Component
 * 
 * Header for the Explore Replays page showing video type information
 * 
 * @param {String} childId - Child's ID
 */
const ExploreReplaysHeader = ({ childId }) => {
    const navigate = useNavigate();
    const theme = useTheme();
    const { getTotalStarsForVideoType } = useExploreVideoWatch(childId);
    const [totalStars, setTotalStars] = useState(0);
    const [loadingStars, setLoadingStars] = useState(true);

    const handleBackClick = () => {
        navigate(`/child/${childId}/explore`);
    };

    // Fetch total stars for replay videos (will be 0 since replays don't award stars)
    useEffect(() => {
        const fetchTotalStars = async () => {
            if (!childId) return;
            
            try {
                setLoadingStars(true);
                const stars = await getTotalStarsForVideoType('replay');
                setTotalStars(stars || 0);
            } catch (error) {
                console.error('Error fetching total stars for replay videos:', error);
                setTotalStars(0);
            } finally {
                setLoadingStars(false);
            }
        };

        fetchTotalStars();

        // Listen for childStatsUpdated event to refresh stars
        const handleStatsUpdate = () => {
            fetchTotalStars();
        };

        window.addEventListener('childStatsUpdated', handleStatsUpdate);

        return () => {
            window.removeEventListener('childStatsUpdated', handleStatsUpdate);
        };
    }, [childId, getTotalStarsForVideoType]);


    return (
        <Paper
            sx={{
                width: '100%',
                padding: '24px',
                borderRadius: '0px',
                boxShadow: theme.shadows[2],
                border: `4px solid ${themeColors.orange}`,
            }}
        >
            {/* Row 1: Back Button */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    marginBottom: '16px',
                }}
            >
                <Button
                    onClick={handleBackClick}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: themeColors.secondary,
                        fontSize: '20px',
                        fontWeight: 600,
                        fontFamily: 'Quicksand, sans-serif',
                        textTransform: 'none',
                        padding: 0,
                        minWidth: 'auto',
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                            transform: 'scale(1.05)',
                            backgroundColor: 'transparent',
                            boxShadow: 'none'
                        },
                    }}
                >
                    <ArrowLeftIcon />
                    <Typography
                        sx={{
                            fontSize: '20px',
                            fontWeight: 600,
                            fontFamily: 'Quicksand, sans-serif',
                            color: themeColors.secondary,
                        }}
                    >
                        Back to Explore
                    </Typography>
                </Button>
            </Box>

            {/* Row 2: Title with Icon */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '12px',
                }}
            >
                <Typography
                    sx={{
                        fontSize: '30px',
                        fontWeight: 600,
                        fontFamily: 'Quicksand, sans-serif',
                        color: themeColors.secondary,
                        textAlign: 'center',
                    }}
                >
                    ▶ Watch Replays
                </Typography>
            </Box>

            {/* Row 3: Description */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: '16px',
                }}
            >
                <Typography
                    sx={{
                        fontSize: '20px',
                        fontWeight: 600,
                        fontFamily: 'Quicksand, sans-serif',
                        color: 'oklch(0.551 0.027 264.364)',
                        textAlign: 'center',
                    }}
                >
                    Watch fun lessons anytime you want!
                </Typography>
            </Box>
        </Paper>
    );
};

export default ExploreReplaysHeader;
