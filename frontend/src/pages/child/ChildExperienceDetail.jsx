import { useParams } from 'react-router-dom';
import ExperienceDetailView from '../../components/child/experience/ExperienceDetailView';
import {
  ExperienceDetailSkeleton,
  ExperienceLoadFailed,
  ExperienceNotFound,
} from '../../components/child/experience/ExperienceDetailStates';
import { useChildExperience } from '../../hooks/experienceChildHook';

/**
 * Explore -> Experience -> one experience: its videos in the admin's order and the printable, drawn like the phone
 * app's Experience page. The bands run edge to edge (the child frame has no side padding), so this page does not add
 * its own column or margin.
 */
const ChildExperienceDetail = ({ childId }) => {
  const { uuid } = useParams();
  const { experience, loading, error, notFound, retry } = useChildExperience(childId, uuid);

  if (notFound) return <ExperienceNotFound childId={childId} />;
  if (error) return <ExperienceLoadFailed childId={childId} message={error} onRetry={retry} />;
  if (loading || !experience) return <ExperienceDetailSkeleton childId={childId} />;
  return <ExperienceDetailView childId={childId} experience={experience} />;
};

export default ChildExperienceDetail;
