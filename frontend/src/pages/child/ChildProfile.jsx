import React from 'react';
import { Box } from '@mui/material';
import { useParams } from 'react-router-dom';
import childProfileService from '../../services/childProfileService';
import HeaderStats from '../../components/child/childprofile/HeaderStats';
import NextLevelProgress from '../../components/child/childprofile/NextLevelProgress';
import AllBadges from '../../components/child/childprofile/AllBadges';
import YourLatestBadges from '../../components/child/childprofile/YourLatestBadges';
import ChildProfileSkeleton from '../../components/child/childprofile/ChildProfileSkeleton';
import ChildLoadError from '../../components/child/common/ChildLoadError';
import { useCachedLoad } from '../../hooks/useCachedLoad';
import { themeColors } from '../../config/themeColors';
import { CHILD_PAGE_NAV_CLEARANCE } from '../../constants/childNavigationLayout';

/**
 * ChildProfile Page
 *
 * Displays child profile with:
 * 1. Header stats (name, total stars, day streak, total badges)
 * 2. Next level progress
 * 3. All badges (locked and unlocked)
 * 4. Latest badges earned (last 5)
 *
 * The three requests run together and the answer is kept per child for the session: only a first visit
 * shows the placeholder, later visits draw the last profile at once and replace it when the refresh
 * arrives (a failed refresh behind real content stays silent).
 */
const loadProfile = async (childId) => {
    try {
        // Fetch all data in parallel
        const [profileResponse, badgesResponse, latestResponse] = await Promise.all([
            childProfileService.getChildProfile(childId),
            childProfileService.getAllBadges(),
            childProfileService.getChildLatestBadges(childId),
        ]);

        return {
            childProfile: profileResponse.data,
            allBadges: badgesResponse.data || [],
            latestBadges: latestResponse.data || [],
        };
    } catch (err) {
        console.error('[ChildProfile] Error fetching data:', err);
        // The services reject with the server's body or a plain message
        const message = typeof err === 'string' ? err : err?.message;
        throw new Error(message || 'Failed to load child profile');
    }
};

const ChildProfile = ({ childId: propChildId }) => {
    const { id: paramChildId } = useParams();
    const childId = propChildId || paramChildId;

    const { data, loaded, error, refresh } = useCachedLoad(
        childId ? `${childId}:profile` : null,
        () => loadProfile(childId)
    );

    if (!childId) {
        return null;
    }

    const { childProfile = null, allBadges = [], latestBadges = [] } = data || {};

    // Extract earned badge IDs
    const earnedBadgeIds = childProfile?.stats?.badges?.map((badge) => badge._id || badge) || [];

    return (
        <Box
            sx={{
                minHeight: '100vh',
                paddingBottom: CHILD_PAGE_NAV_CLEARANCE,
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
                {/* First visit: the same blocks as placeholders */}
                {!loaded && !error && <ChildProfileSkeleton />}

                {/* A first load that failed can be tried again */}
                {error && (
                    <Box sx={{ backgroundColor: themeColors.bgCard, borderRadius: '12px' }}>
                        <ChildLoadError compact message={error} onRetry={() => refresh().catch(() => {})} />
                    </Box>
                )}

                {childProfile && (
                    <>
                        {/* 1st Row: Header Stats */}
                        <HeaderStats child={childProfile} stats={childProfile.stats} />

                        {/* 2nd Row: Next Level Progress */}
                        <NextLevelProgress stats={childProfile.stats} />

                        {/* 3rd Row: All Badges */}
                        <AllBadges allBadges={allBadges} earnedBadgeIds={earnedBadgeIds} />

                        {/* 4th Row: Latest Badges */}
                        <YourLatestBadges latestBadges={latestBadges} />
                    </>
                )}
            </Box>
        </Box>
    );
};

export default ChildProfile;
