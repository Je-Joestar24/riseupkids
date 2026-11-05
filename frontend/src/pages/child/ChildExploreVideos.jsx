import { Box, useMediaQuery } from "@mui/material";
import { useTheme } from '@mui/material/styles';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import ExploreVideosHeader from "../../components/child/explorevideos/ExploreVideosHeader";
import ExploreVideosShare from "../../components/child/explorevideos/ExploreVideosShare";
import ExploreVideosCards from "../../components/child/explorevideos/ExploreVideosCards";
import ExploreVideosFooter from "../../components/child/explorevideos/ExploreVideosFooter";
import { useExploreVideoWatch } from "../../hooks/exploreVideoWatchHook";
import { useCachedLoad } from '../../hooks/useCachedLoad';
import { CHILD_PAGE_NAV_CLEARANCE } from '../../constants/childNavigationLayout';
import { phoneFluid } from '../../constants/childPhoneLayout';

const ChildExploreVideos = ({ childId }) => {
    const theme = useTheme();
    // The app no longer shows the share card on this page. On phones it is left out here too (computers and tablets keep it).
    const isPhone = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
    const { videoType } = useParams();
    const { getTotalStarsForVideoType } = useExploreVideoWatch(childId);
    // The total is cached per child and video type: only a first visit shows the placeholder.
    // null until the first answer, so the header shows a placeholder instead of a wrong 0.
    const stars = useCachedLoad(
        childId && videoType ? `${childId}:explore:stars:${videoType}` : null,
        () => getTotalStarsForVideoType(videoType, { strict: true })
    );
    const totalStars = stars.loaded ? (stars.data || 0) : stars.error ? 0 : null;

    // Get child data from sessionStorage
    const getChildData = () => {
        try {
            const childProfiles = JSON.parse(sessionStorage.getItem('childProfiles') || '[]');
            return childProfiles.find(child => child._id === childId) || null;
        } catch (error) {
            return null;
        }
    };

    // Refresh quietly when a video is watched (the number is replaced, never blanked)
    useEffect(() => {
        if (!childId || !videoType) return undefined;

        const refreshStars = () => {
            stars.refresh().catch(() => {});
        };
        window.addEventListener('childStatsUpdated', refreshStars);
        return () => {
            window.removeEventListener('childStatsUpdated', refreshStars);
        };
    }, [childId, videoType, stars.refresh]);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                paddingBottom: CHILD_PAGE_NAV_CLEARANCE,
                paddingTop: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                backgroundColor: 'rgb(253, 232, 222)',
            }}
        >
            <Box
                sx={{
                    maxWidth: '848px',
                    width: '100%',
                    margin: '0 auto',
                    gap: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    // phones: a little more room at the sides (16px before)
                    px: { xs: phoneFluid(14, 22), sm: '24px', md: 0 },
                }}
            >
                <ExploreVideosHeader
                    childId={childId}
                    videoType={videoType}
                    totalStars={totalStars ?? 0}
                    loading={totalStars === null}
                />

                {!isPhone && (
                    <ExploreVideosShare
                        childId={childId}
                        videoType={videoType}
                        totalStars={totalStars}
                    />
                )}

                <ExploreVideosCards
                    childId={childId}
                    videoType={videoType}
                />

                <ExploreVideosFooter videoType={videoType} />
            </Box>
        </Box>
    )
}

export default ChildExploreVideos;