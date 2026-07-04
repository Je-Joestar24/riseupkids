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
    const [totalStars, setTotalStars] = useState(0);
    const [loadingStars, setLoadingStars] = useState(true);

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
        const fetchTotalStars = async () => {
            if (!childId || !videoType) return;
            
            try {
                setLoadingStars(true);
                const stars = await getTotalStarsForVideoType(videoType);
                setTotalStars(stars || 0);
            } catch (error) {
                console.error('Error fetching total stars for video type:', error);
                setTotalStars(0);
            } finally {
                setLoadingStars(false);
            }
        };

        fetchTotalStars();

        // Listen for childStatsUpdated event to refresh stars when a video is watched
        const handleStatsUpdate = () => {
            fetchTotalStars();
        };

        window.addEventListener('childStatsUpdated', handleStatsUpdate);

        return () => {
            window.removeEventListener('childStatsUpdated', handleStatsUpdate);
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
                    totalStars={totalStars}
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