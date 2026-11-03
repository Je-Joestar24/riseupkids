import { Box } from "@mui/material";
import { useTheme } from '@mui/material/styles';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ExploreVideosHeader from "../../components/child/explorevideos/ExploreVideosHeader";
import ExploreVideosShare from "../../components/child/explorevideos/ExploreVideosShare";
import ExploreVideosCards from "../../components/child/explorevideos/ExploreVideosCards";
import ExploreVideosFooter from "../../components/child/explorevideos/ExploreVideosFooter";
import { useExploreVideoWatch } from "../../hooks/exploreVideoWatchHook";
import { CHILD_PAGE_NAV_CLEARANCE } from '../../constants/childNavigationLayout';

const ChildExploreVideos = ({ childId }) => {
    const theme = useTheme();
    const { videoType } = useParams();
    const { getTotalStarsForVideoType } = useExploreVideoWatch(childId);
    // null until the first answer, so the header shows a placeholder instead of a wrong 0
    const [totalStars, setTotalStars] = useState(null);

    // Get child data from sessionStorage
    const getChildData = () => {
        try {
            const childProfiles = JSON.parse(sessionStorage.getItem('childProfiles') || '[]');
            return childProfiles.find(child => child._id === childId) || null;
        } catch (error) {
            return null;
        }
    };

    // Fetch total stars for this video type from API
    useEffect(() => {
        if (!childId || !videoType) return undefined;

        let cancelled = false;
        const fetchTotalStars = async () => {
            try {
                const stars = await getTotalStarsForVideoType(videoType);
                if (!cancelled) setTotalStars(stars || 0);
            } catch (error) {
                console.error('Error fetching total stars for video type:', error);
                if (!cancelled) setTotalStars((previous) => previous ?? 0);
            }
        };

        setTotalStars(null);
        fetchTotalStars();

        // Refresh quietly when a video is watched (the number is replaced, never blanked)
        window.addEventListener('childStatsUpdated', fetchTotalStars);

        return () => {
            cancelled = true;
            window.removeEventListener('childStatsUpdated', fetchTotalStars);
        };
    }, [childId, videoType, getTotalStarsForVideoType]);

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
                    px: { xs: '16px', sm: '24px', md: 0 },
                }}
            >
                <ExploreVideosHeader
                    childId={childId}
                    videoType={videoType}
                    totalStars={totalStars ?? 0}
                    loading={totalStars === null}
                />

                <ExploreVideosShare
                    childId={childId}
                    videoType={videoType}
                    totalStars={totalStars}
                />

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