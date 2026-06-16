import { useSelector } from 'react-redux';
import { USER_ROLES } from '../config/constants';

/**
 * Returns the URL base path for content management routes based on role.
 */
export const useContentBasePath = () => {
  const user = useSelector((state) => state.user.user);
  const role = user?.role;

  if (role === USER_ROLES.CONTENT_CREATOR) return '/content-creator';
  if (role === USER_ROLES.TEACHER) return '/teacher';
  return '/admin';
};

export default useContentBasePath;
