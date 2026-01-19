import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { EXPLORE_VIDEO_TYPES, VIDEO_TYPE_LABELS } from '../../../constants/exploreVideoTypes';
import { themeColors } from '../../../config/themeColors';

/**
 * Video Type Descriptions
 */
const VIDEO_TYPE_DESCRIPTIONS = {
    [EXPLORE_VIDEO_TYPES.REPLAY]: "Let's watch your favorite videos again! 🎬",
    [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: "Let's get creative and make something amazing! 🎨",
    [EXPLORE_VIDEO_TYPES.COOKING]: "Let's cook something delicious! 👨‍🍳",
    [EXPLORE_VIDEO_TYPES.MUSIC]: "Make beautiful music together! 🎵",
    [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: "Get moving and stay healthy! 💪",
    [EXPLORE_VIDEO_TYPES.STORY_TIME]: "Let's read wonderful stories! 📚",
    [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: "Learn to be kind and polite! 😊",
};

/**
 * SVG Icons for each video type (48x48 size for header)
 */
const VideoTypeIcons = {
    [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e98a68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"></path>
            <circle cx="13.5" cy="6.5" r=".5" fill="#e98a68"></circle>
            <circle cx="17.5" cy="10.5" r=".5" fill="#e98a68"></circle>
            <circle cx="6.5" cy="12.5" r=".5" fill="#e98a68"></circle>
            <circle cx="8.5" cy="7.5" r=".5" fill="#e98a68"></circle>
        </svg>
    ),
    [EXPLORE_VIDEO_TYPES.COOKING]: (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e98a68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"></path>
            <path d="M6 17h12"></path>
        </svg>
    ),
    [EXPLORE_VIDEO_TYPES.MUSIC]: (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e98a68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18V5l12-2v13"></path>
            <path d="m9 9 12-2"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
        </svg>
    ),
    [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e98a68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
        </svg>
    ),
    [EXPLORE_VIDEO_TYPES.STORY_TIME]: (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e98a68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 7v14"></path>
            <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
        </svg>
    ),
    [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e98a68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m11 17 2 2a1 1 0 1 0 3-3"></path>
            <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"></path>
            <path d="m21 3 1 11h-2"></path>
            <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"></path>
            <path d="M3 4h8"></path>
        </svg>
    ),
    [EXPLORE_VIDEO_TYPES.REPLAY]: (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e98a68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
            <path d="M3 21v-5h5"></path>
        </svg>
    ),
};

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
 * ExploreVideosHeader Component
 * 
 * Header for the Explore Videos page showing video type information
 * 
 * @param {String} childId - Child's ID
 * @param {String} videoType - Video type (e.g., 'cooking', 'music', etc.)
 * @param {Number} totalStars - Total stars earned for this video type
 */
const ExploreVideosHeader = ({ childId, videoType, totalStars = 0 }) => {
    const navigate = useNavigate();
    const theme = useTheme();

    const handleBackClick = () => {
        navigate(`/child/${childId}/explore`);
    };

    const label = VIDEO_TYPE_LABELS[videoType] || videoType;
    const description = VIDEO_TYPE_DESCRIPTIONS[videoType] || "Let's explore! 🎉";
    const icon = VideoTypeIcons[videoType];

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
                {icon && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: themeColors.secondary,
                            width: '48px',
                            height: '48px',
                            minWidth: '48px',
                            minHeight: '48px',
                            '& svg': {
                                width: '48px',
                                height: '48px',
                            },
                        }}
                    >
                        {icon}
                    </Box>
                )}
                <Typography
                    sx={{
                        fontSize: '36px',
                        fontWeight: 600,
                        fontFamily: 'Quicksand, sans-serif',
                        color: themeColors.secondary,
                        textAlign: 'center',
                    }}
                >
                    {label}
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
                    {description}
                </Typography>
            </Box>

            {/* Row 4: Total Stars Earned */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    paddingTop: '16px',
                    paddingBottom: '16px',
                    width: '100%',
                    background: `linear-gradient(to right, #fde8de, #d4e6e3)`,
                    borderRadius: '15px'
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    <StarIcon />
                    <Typography
                        sx={{
                            fontSize: '20px',
                            fontWeight: 600,
                            fontFamily: 'Quicksand, sans-serif',
                            color: themeColors.accent,
                        }}
                    >
                        {totalStars}
                    </Typography>
                </Box>
                <Typography
                    sx={{
                        fontSize: '20px',
                        fontWeight: 600,
                        fontFamily: 'Quicksand, sans-serif',
                        color: themeColors.accent,
                    }}
                >
                    Total Stars Earned
                </Typography>
            </Box>
        </Paper>
    );
};

export default ExploreVideosHeader;
