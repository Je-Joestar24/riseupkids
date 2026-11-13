import { Box } from '@mui/material';
import ExperiencesHeader from '../../components/child/experience/ExperiencesHeader';
import ExperiencesList from '../../components/child/experience/ExperiencesList';
import { useChildExperiences } from '../../hooks/experienceChildHook';
import { CHILD_PAGE_NAV_CLEARANCE } from '../../constants/childNavigationLayout';
import { phoneFluid } from '../../constants/childPhoneLayout';

/**
 * Explore -> Experience: every published experience with its cover picture.
 * (Same frame as the other Explore pages: peach page, 848px column, header card on top.)
 */
const ChildExperiences = ({ childId }) => {
  const { experiences, loading, error, retry } = useChildExperiences(childId);

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
          px: { xs: phoneFluid(14, 22), sm: '24px', md: 0 },
        }}
      >
        <ExperiencesHeader childId={childId} />
        <ExperiencesList experiences={experiences} childId={childId} loading={loading} error={error} onRetry={retry} />
      </Box>
    </Box>
  );
};

export default ChildExperiences;
