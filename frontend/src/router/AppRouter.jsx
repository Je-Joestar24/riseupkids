import React from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import AuthLogin from '../pages/auth/AuthLogin';
import ParentsChild from '../pages/parents/ParentsChild';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminActivities from '../pages/admin/AdminActivities';
import AdminCourses from '../pages/admin/AdminCourses';
import AdminLayout from '../layouts/AdminLayout';
import ChildLayout from '../layouts/ChildLayout';
import ChildHome from '../pages/child/ChildHome';
import ChildJourney from '../pages/child/ChildJourney';
import AuthedAccess from './access/AuthedAccess';
import UnAuthed from './access/UnAuthed';

/**
 * ChildRouteWrapper Component
 * 
 * Wraps child routes to extract childId from URL params
 * and pass it to ChildLayout and child pages
 */
const ChildRouteWrapper = ({ children }) => {
  const { id } = useParams();
  
  return (
    <ChildLayout childId={id}>
      {React.cloneElement(children, { childId: id })}
    </ChildLayout>
  );
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <UnAuthed>
              <AuthLogin />
            </UnAuthed>
          }
        />

        {/* Protected Routes */}
        {/* Parent Routes */}
        <Route
          path="/parents/child"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ParentsChild />
            </AuthedAccess>
          }
        />

        {/* Child Routes */}
        <Route
          path="/child/:id/home"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ChildRouteWrapper>
                <ChildHome />
              </ChildRouteWrapper>
            </AuthedAccess>
          }
        />
        <Route
          path="/child/:id/journey"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ChildRouteWrapper>
                <ChildJourney />
              </ChildRouteWrapper>
            </AuthedAccess>
          }
        />
        <Route
          path="/child/:id/explore"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ChildRouteWrapper>
                <ChildHome /> {/* Placeholder - will be replaced with Explore page */}
              </ChildRouteWrapper>
            </AuthedAccess>
          }
        />
        <Route
          path="/child/:id/wall"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ChildRouteWrapper>
                <ChildHome /> {/* Placeholder - will be replaced with Kids' Wall page */}
              </ChildRouteWrapper>
            </AuthedAccess>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <AuthedAccess allowedRoles={['admin']}>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AuthedAccess allowedRoles={['admin']}>
              <AdminLayout>
                <AdminUsers />
              </AdminLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/admin/courses/contents"
          element={
            <AuthedAccess allowedRoles={['admin']}>
              <AdminLayout>
                <AdminActivities />
              </AdminLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/admin/courses"
          element={
            <AuthedAccess allowedRoles={['admin']}>
              <AdminLayout>
                <AdminCourses />
              </AdminLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AuthedAccess allowedRoles={['admin']}>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </AuthedAccess>
          }
        />

        {/* Default route - redirect to login */}
        <Route path="/" element={<AuthLogin />} />

        {/* Add more routes here as pages are created */}
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;


