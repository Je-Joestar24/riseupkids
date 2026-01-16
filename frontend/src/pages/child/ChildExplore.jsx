import { Box } from "@mui/material";
import { useTheme } from '@mui/material/styles';
import ExploreSomething from "../../components/child/explore/ExploreSomething";
import ExploreReplays from "../../components/child/explore/ExploreReplays";
import ExploreVideoCollectionsCards from "../../components/child/explore/ExploreVideoCollectionsCards";
import ExploreFooter from "../../components/child/explore/ExploreFooter";

const ChildExplore = ({ childId }) => {

    const theme = useTheme();
    // Get child data from sessionStorage
    const getChildData = () => {
        try {
            const childProfiles = JSON.parse(sessionStorage.getItem('childProfiles') || '[]');
            return childProfiles.find(child => child._id === childId) || null;
        } catch (error) {
            return null;
        }
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
                }}
            >
                <ExploreReplays />
                <ExploreSomething />
                <ExploreVideoCollectionsCards />
                <ExploreFooter />
            </Box>
        </Box>
    )
}

export default ChildExplore;