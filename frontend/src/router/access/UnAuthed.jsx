import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { creatorLandingPath } from '../../utils/contentCreatorAccess';

/**
 * UnAuthed Component
 * 
 * Protects routes that should only be accessible when NOT authenticated
 * Redirects authenticated users away from login/register pages
 */
const UnAuthed = ({ children, redirectTo = '/' }) => {
  const { isAuthenticated, loading, user } = useSelector((state) => state.user);

  // Show children while loading
  if (loading) {
    return children;
  }

  // Redirect if authenticated
  if (isAuthenticated && user) {
    // Redirect based on role
    if (user.role === 'parent') {
      return <Navigate to="/parents/child" replace />;
    } else if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === 'teacher') {
      return <Navigate to="/teacher/dashboard" replace />;
    } else if (user.role === 'content_creator') {
      // Her first allowed page (a creator with no area at all gets /content-creator, which tells her so)
      return <Navigate to={creatorLandingPath(user) || '/content-creator'} replace />;
    } else if (user.role === 'child') {
      return <Navigate to="/child/dashboard" replace />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default UnAuthed;

