import { Box } from "@mui/material";
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ExploreSomething from "../../components/child/explore/ExploreSomething";
import ExperienceButton from "../../components/child/experience/ExperienceButton";
import ExploreReplays from "../../components/child/explore/ExploreReplays";
import ExploreVideoCollectionsCards from "../../components/child/explore/ExploreVideoCollectionsCards";
import ExploreFooter from "../../components/child/explore/ExploreFooter";
import ExploreStarCam from "../../components/child/explore/ExploreStarCam";
import { CHILD_PAGE_NAV_CLEARANCE } from '../../constants/childNavigationLayout';
import { phoneFluid } from '../../constants/childPhoneLayout';

const ChildExplore = ({ childId }) => {
    const theme = useTheme();
    const navigate = useNavigate();

    // Get child data from sessionStorage
    const getChildData = () => {
        try {
            const childProfiles = JSON.parse(sessionStorage.getItem('childProfiles') || '[]');
            return childProfiles.find(child => child._id === childId) || null;
        } catch (error) {
            return null;
        }
    };

    // Handle video type click - navigate to ExploreVideos page
    const handleVideoTypeClick = (videoType) => {
        navigate(`/child/${childId}/explore/videos/${videoType}`);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                paddingBottom: CHILD_PAGE_NAV_CLEARANCE,
                paddingTop: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                backgroundColor: 'rgb(253, 232, 222)'
            }}
        >
            <Box
                sx={{
                    maxWidth: '848px',
                    width: '100%',
                    margin: '0 auto',
                    // phones: a little more room at the sides (16px before)
                    px: { xs: phoneFluid(14, 22), sm: '24px', md: 0 },
                }}
            >
                <ExperienceButton childId={childId} />
                <ExploreReplays childId={childId} />
                <ExploreSomething />
                <ExploreVideoCollectionsCards onVideoTypeClick={handleVideoTypeClick} childId={childId} />
                {/* <ExploreStarCam /> */}
                {/* <ExploreFooter /> */}
            </Box>
        </Box>
    )
}

export default ChildExplore;