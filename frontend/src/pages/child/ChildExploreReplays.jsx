import { Box } from "@mui/material";
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ExploreReplaysHeader from '../../components/child/explorereplays/ExploreReplaysHeader';
import ExploreReplaysCards from '../../components/child/explorereplays/ExploreReplaysCards';
import ExploreReplaysFooter from "../../components/child/explorereplays/ExploreReplaysFooter";

const ChildExploreReplays = ({ childId }) => {
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
                paddingBottom: '90px', // Space for fixed bottom navigation
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
                    gap: '20px',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <ExploreReplaysHeader
                    childId={childId} />

                <ExploreReplaysCards
                    childId={childId} />

                <ExploreReplaysFooter />
            </Box>
        </Box>
    )
}

export default ChildExploreReplays;