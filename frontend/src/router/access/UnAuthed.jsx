import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

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
    } else if (user.role === 'child') {
      return <Navigate to="/child/dashboard" replace />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default UnAuthed;

