import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { themeColors } from '../../../config/themeColors';
import { getBadgeIcon } from '../../../constants/badgeIcons';

/**
 * AllBadges Component
 * 
 * Displays all available badges (locked and unlocked)
 * Shows earned badges with full color, locked badges greyed out
 */
const AllBadges = ({ allBadges = [], earnedBadgeIds = [] }) => {
    // Create a set of earned badge IDs for quick lookup
    const earnedSet = new Set(earnedBadgeIds.map((id) => id.toString()));

    // Sort badges by order
    const sortedBadges = [...allBadges].sort((a, b) => {
        if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
        return a.name.localeCompare(b.name);
    });

    if (sortedBadges.length === 0) {
        return (
            <Paper
                sx={{
                    padding: { xs: '20px', sm: '24px' },
                    borderRadius: '0px',
                    backgroundColor: 'white',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    border: `2px solid ${themeColors.border}`,
                }}
            >
                <Typography
                    sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontSize: { xs: '16px', sm: '18px' },
                        fontWeight: 600,
                        color: themeColors.textSecondary,
                        textAlign: 'center',
                    }}
                >
                    No badges available
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper
            sx={{
                padding: { xs: '20px', sm: '24px' },
                backgroundColor: 'transparent',
            }}
        >
            <Typography
                sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: { xs: '20px', sm: '24px' },
                    fontWeight: 700,
                    color: themeColors.bgLogin,
                    marginBottom: { xs: '16px', sm: '20px' },
                }}
            >
                Your Amazing Badges!
            </Typography>

            <Grid container spacing={{ xs: 2, sm: 3 }}>
                {sortedBadges.map((badge) => {
                    const isEarned = earnedSet.has(badge._id?.toString() || badge.id?.toString());
                    const icon = getBadgeIcon(badge);

                    return (
                        <Grid item xs={6} sm={4} md={3} key={badge._id || badge.id}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    padding: { xs: '12px', sm: '16px' },
                                    backgroundColor: isEarned ? themeColors.bgSecondary : themeColors.bgTertiary,
                                    borderRadius: '24px',
                                    border: `2px solid ${isEarned ? themeColors.secondary : themeColors.border}`,
                                    opacity: isEarned ? 1 : 0.6,
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                    minHeight: { xs: '140px', sm: '160px' }, // Fixed height for consistency
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                                    },
                                }}
                            >
                                {/* Badge Icon */}
                                <Box
                                    sx={{
                                        fontSize: { xs: '32px', sm: '40px' },
                                        marginBottom: '8px',
                                        filter: isEarned ? 'none' : 'grayscale(100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: { xs: '40px', sm: '48px' }, // Fixed height for icon
                                        width: '100%',
                                    }}
                                >
                                    {icon}
                                </Box>

                                {/* Lock Icon for locked badges */}
                                {!isEarned && (
                                    <LockIcon
                                        sx={{
                                            fontSize: { xs: '16px', sm: '20px' },
                                            color: themeColors.textSecondary,
                                            marginBottom: '8px',
                                            height: { xs: '20px', sm: '24px' }, // Fixed height for lock icon
                                        }}
                                        aria-hidden="true"
                                    />
                                )}

                                {/* Badge Name */}
                                <Typography
                                    sx={{
                                        fontFamily: 'Quicksand, sans-serif',
                                        fontSize: { xs: '12px', sm: '14px' },
                                        fontWeight: isEarned ? 700 : 500,
                                        color: isEarned ? themeColors.text : themeColors.textSecondary,
                                        textAlign: 'center',
                                        lineHeight: 1.2,
                                        minHeight: { xs: '32px', sm: '36px' }, // Fixed min height for text
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {badge.name}
                                </Typography>
                            </Box>
                        </Grid>
                    );
                })}
            </Grid>
        </Paper>
    );
};

export default AllBadges;
