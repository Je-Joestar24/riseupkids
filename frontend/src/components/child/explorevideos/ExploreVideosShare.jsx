import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { EXPLORE_VIDEO_TYPES } from '../../../constants/exploreVideoTypes';
import { themeColors } from '../../../config/themeColors';


/**
 * Share Titles for each video type
 */
const SHARE_TITLES = {
    [EXPLORE_VIDEO_TYPES.REPLAY]: "Share My Favorite!",
    [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: "Made Something Amazing?",
    [EXPLORE_VIDEO_TYPES.COOKING]: "Made Something Tasty?",
    [EXPLORE_VIDEO_TYPES.MUSIC]: "Made Beautiful Music?",
    [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: "Did Something Active?",
    [EXPLORE_VIDEO_TYPES.STORY_TIME]: "Read a Great Story?",
    [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: "Did Something Kind?",
};

/**
 * Share Subtitles for each video type
 */
const SHARE_SUBTITLES = {
    [EXPLORE_VIDEO_TYPES.REPLAY]: "Show everyone what you love!",
    [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: "Share your artwork with friends in Show & Tell!",
    [EXPLORE_VIDEO_TYPES.COOKING]: "Share your cooking creations with friends in Show & Tell!",
    [EXPLORE_VIDEO_TYPES.MUSIC]: "Share your songs and recordings with friends in Show & Tell!",
    [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: "Share your fitness activities with friends in Show & Tell!",
    [EXPLORE_VIDEO_TYPES.STORY_TIME]: "Record yourself reading and share with friends in Show & Tell!",
    [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: "Share your good manners and kind actions with friends in Show & Tell!",
};

const SHARE_BUTTONS = {
    [EXPLORE_VIDEO_TYPES.REPLAY]: "Share My Favorite!",
    [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: "📸 Share My Art!",
    [EXPLORE_VIDEO_TYPES.COOKING]: "📸 Share My Food!",
    [EXPLORE_VIDEO_TYPES.MUSIC]: "🎤 Share My Music!",
    [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: "📸 Share My Activity!",
    [EXPLORE_VIDEO_TYPES.STORY_TIME]: "🎤 Share My Story!",
    [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: "📸 Share My Kindness!",
};
/**
 * ExploreVideosShare Component
 * 
 * Share component for the Explore Videos page
 * Allows children to share their work for each video type
 * 
 * @param {String} childId - Child's ID
 * @param {String} videoType - Video type (e.g., 'cooking', 'music', etc.)
 */
const ExploreVideosShare = ({ childId, videoType }) => {
    const theme = useTheme();

    const handleShareClick = () => {
        // TODO: Implement share functionality
        // This will allow child to upload something related to the video type
        console.log('Share clicked for video type:', videoType);
    };

    const shareTitle = SHARE_TITLES[videoType] || "Share My Work!";
    const shareSubtitle = SHARE_SUBTITLES[videoType] || "Show everyone what you did!";
    const shareButtonText = SHARE_BUTTONS[videoType] || "Share My Work!";

    return (
        <Paper
            sx={{
                width: '100%',
                padding: '24px',
                borderRadius: '0px',
                boxShadow: theme.shadows[2],
                border: `4px solid ${themeColors.accent}`,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                }}
            >
                {/* First Column: Title and Subtitle */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                    }}
                >
                    {/* Row 1: Title */}
                    <Typography
                        sx={{
                            fontFamily: 'Quicksand, sans-serif',
                            fontSize: '24px',
                            fontWeight: 600,
                            color: themeColors.secondary,
                            marginBottom: '4px',
                        }}
                    >
                        {shareTitle}
                    </Typography>

                    {/* Row 2: Subtitle */}
                    <Typography
                        sx={{
                            fontFamily: 'Quicksand, sans-serif',
                            fontSize: '18px',
                            fontWeight: 600,
                            color: 'oklch(0.446 0.03 256.802)',
                        }}
                    >
                        {shareSubtitle}
                    </Typography>
                </Box>

                {/* Second Column: Button */}
                <Button
                    onClick={handleShareClick}
                    sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontSize: '20px',
                        fontWeight: 600,
                        textTransform: 'none',
                        padding: '16px 32px',
                        borderRadius: '0px',
                        backgroundColor: themeColors.orange,
                        color: themeColors.textInverse,
                        paddingLeft: 'auto',
                        marginLeft: 'auto',
                        transition: 'transform 0.3s ease',
                        '&:hover': {
                            backgroundColor: themeColors.orange,
                            transform: 'scale(1.05)',
                        },
                    }}
                >
                    {shareButtonText}
                </Button>
            </Box>
        </Paper>
    );
};

export default ExploreVideosShare;
