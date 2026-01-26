import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import childProfileService from '../../services/childProfileService';
import HeaderStats from '../../components/child/childprofile/HeaderStats';
import NextLevelProgress from '../../components/child/childprofile/NextLevelProgress';
import AllBadges from '../../components/child/childprofile/AllBadges';
import YourLatestBadges from '../../components/child/childprofile/YourLatestBadges';
import { themeColors } from '../../config/themeColors';

/**
 * ChildProfile Page
 * 
 * Displays child profile with:
 * 1. Header stats (name, total stars, day streak, total badges)
 * 2. Next level progress
 * 3. All badges (locked and unlocked)
 * 4. Latest badges earned (last 5)
 */
const ChildProfile = ({ childId: propChildId }) => {
    const { id: paramChildId } = useParams();
    const childId = propChildId || paramChildId;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [childProfile, setChildProfile] = useState(null);
    const [allBadges, setAllBadges] = useState([]);
    const [latestBadges, setLatestBadges] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!childId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Fetch all data in parallel
                const [profileResponse, badgesResponse, latestResponse] = await Promise.all([
                    childProfileService.getChildProfile(childId),
                    childProfileService.getAllBadges(),
                    childProfileService.getChildLatestBadges(childId),
                ]);

                setChildProfile(profileResponse.data);
                setAllBadges(badgesResponse.data || []);
                setLatestBadges(latestResponse.data || []);
            } catch (err) {
                console.error('[ChildProfile] Error fetching data:', err);
                setError(err?.message || 'Failed to load child profile');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [childId]);

    if (loading) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '20px',
                }}
            >
                <CircularProgress sx={{ color: themeColors.primary }} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '20px',
                }}
            >
                <Box
                    sx={{
                        padding: '24px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: `2px solid ${themeColors.error}`,
                    }}
                >
                    <Box
                        sx={{
                            fontFamily: 'Quicksand, sans-serif',
                            fontSize: '18px',
                            fontWeight: 600,
                            color: themeColors.error,
                        }}
                    >
                        Error: {error}
                    </Box>
                </Box>
            </Box>
        );
    }

    if (!childProfile) {
        return null;
    }

    // Extract earned badge IDs
    const earnedBadgeIds = childProfile.stats?.badges?.map((badge) => badge._id || badge) || [];

    return (
        <Box
            sx={{
                minHeight: '100vh',
                paddingBottom: '90px', // Space for fixed bottom navigation
                paddingTop: '20px',
            }}
        >
            <Box
                sx={{
                    maxWidth: '848px',
                    width: '100%',
                    margin: '0 auto',
                    padding: { xs: '16px', sm: '24px' },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: { xs: '16px', sm: '20px' },
                }}
            >
                {/* 1st Row: Header Stats */}
                <HeaderStats child={childProfile} stats={childProfile.stats} />

                {/* 2nd Row: Next Level Progress */}
                <NextLevelProgress stats={childProfile.stats} />

                {/* 3rd Row: All Badges */}
                <AllBadges allBadges={allBadges} earnedBadgeIds={earnedBadgeIds} />

                {/* 4th Row: Latest Badges */}
                <YourLatestBadges latestBadges={latestBadges} />
            </Box>
        </Box>
    );
};

export default ChildProfile;
