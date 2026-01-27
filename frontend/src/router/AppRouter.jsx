import React from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import AuthLogin from '../pages/auth/AuthLogin';
import ParentSignup from '../pages/auth/ParentSignup';
import ParentSignupSuccess from '../pages/auth/ParentSignupSuccess';
import ParentSignupCancel from '../pages/auth/ParentSignupCancel';
import ParentsChild from '../pages/parents/ParentsChild';
import ParentsLogin from '../pages/parents/ParentsLogin';
import ParentDashboard from '../pages/parents/ParentDashboard';
import ParentsLayout from '../layouts/ParentsLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminTeachers from '../pages/admin/AdminTeachers';
import AdminActivities from '../pages/admin/AdminActivities';
import AdminCourses from '../pages/admin/AdminCourses';
import AdminExplore from '../pages/admin/AdminExplore';
import AdminKidsWall from '../pages/admin/AdminKidsWall';
import AdminCheckingAudio from '../pages/admin/AdminCheckingAudio';
import AdminMeetings from '../pages/admin/AdminMeetings';
import AdminLayout from '../layouts/AdminLayout';
import TeacherLayout from '../layouts/TeacherLayout';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import ChildLayout from '../layouts/ChildLayout';
import ChildHome from '../pages/child/ChildHome';
import ChildJourney from '../pages/child/ChildJourney';
import ChildJourneyModule from '../pages/child/ChildJourneyModule';
import ChildKidsWall from '../pages/child/ChildKidsWall';
import ChildShareSomething from '../pages/child/ChildShareSomething';
import AuthedAccess from './access/AuthedAccess';
import UnAuthed from './access/UnAuthed';
import ChildExplore from '../pages/child/ChildExplore';
import ChildExploreVideos from '../pages/child/ChildExploreVideos';
import ChildExploreReplays from '../pages/child/ChildExploreReplays';
import ChildProfile from '../pages/child/ChildProfile';

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
        <Route
          path="/parent/signup"
          element={
            <UnAuthed>
              <ParentSignup />
            </UnAuthed>
          }
        />
        <Route
          path="/parent/signup/success"
          element={
            <UnAuthed>
              <ParentSignupSuccess />
            </UnAuthed>
          }
        />
        <Route
          path="/parent/signup/cancel"
          element={
            <UnAuthed>
              <ParentSignupCancel />
            </UnAuthed>
          }
        />
        <Route
          path="/parents/login"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ParentsLogin />
            </AuthedAccess>
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
        <Route
          path="/parent/dashboard"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ParentsLayout>
                <ParentDashboard />
              </ParentsLayout>
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
          path="/child/:id/journey/:courseId"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ChildRouteWrapper>
                <ChildJourneyModule />
              </ChildRouteWrapper>
            </AuthedAccess>
          }
        />
        <Route
          path="/child/:id/explore"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ChildRouteWrapper>
                <ChildExplore />
              </ChildRouteWrapper>
            </AuthedAccess>
          }
        />
        <Route
          path="/child/:id/explore/videos/:videoType"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ChildRouteWrapper>
                <ChildExploreVideos />
              </ChildRouteWrapper>
            </AuthedAccess>
          }
        />
        <Route
          path="/child/:id/explore/replays"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ChildRouteWrapper>
                <ChildExploreReplays />
              </ChildRouteWrapper>
            </AuthedAccess>
          }
        />
        <Route
          path="/child/:id/wall"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ChildRouteWrapper>
                <ChildKidsWall />
              </ChildRouteWrapper>
            </AuthedAccess>
          }
        />
        <Route
          path="/child/:id/wall/share"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ChildRouteWrapper>
                <ChildShareSomething />
              </ChildRouteWrapper>
            </AuthedAccess>
          }
        />
        <Route
          path="/child/:id/profile"
          element={
            <AuthedAccess allowedRoles={['parent']}>
              <ChildRouteWrapper>
                <ChildProfile />
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
          path="/admin/teachers"
          element={
            <AuthedAccess allowedRoles={['admin']}>
              <AdminLayout>
                <AdminTeachers />
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
          path="/admin/courses/explore"
          element={
            <AuthedAccess allowedRoles={['admin']}>
              <AdminLayout>
                <AdminExplore />
              </AdminLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/admin/kids-wall"
          element={
            <AuthedAccess allowedRoles={['admin']}>
              <AdminLayout>
                <AdminKidsWall />
              </AdminLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/admin/checking-audio"
          element={
            <AuthedAccess allowedRoles={['admin', 'teacher']}>
              <AdminLayout>
                <AdminCheckingAudio />
              </AdminLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/admin/meetings"
          element={
            <AuthedAccess allowedRoles={['admin', 'teacher']}>
              <AdminLayout>
                <AdminMeetings />
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

        {/* Teacher Routes */}
        <Route
          path="/teacher/dashboard"
          element={
            <AuthedAccess allowedRoles={['teacher']}>
              <TeacherLayout>
                <TeacherDashboard />
              </TeacherLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/teacher/courses/contents"
          element={
            <AuthedAccess allowedRoles={['teacher']}>
              <TeacherLayout>
                <AdminActivities />
              </TeacherLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/teacher/courses"
          element={
            <AuthedAccess allowedRoles={['teacher']}>
              <TeacherLayout>
                <AdminCourses />
              </TeacherLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/teacher/courses/explore"
          element={
            <AuthedAccess allowedRoles={['teacher']}>
              <TeacherLayout>
                <AdminExplore />
              </TeacherLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/teacher/kids-wall"
          element={
            <AuthedAccess allowedRoles={['teacher']}>
              <TeacherLayout>
                <AdminKidsWall />
              </TeacherLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/teacher/checking-audio"
          element={
            <AuthedAccess allowedRoles={['admin', 'teacher']}>
              <TeacherLayout>
                <AdminCheckingAudio />
              </TeacherLayout>
            </AuthedAccess>
          }
        />
        <Route
          path="/teacher/*"
          element={
            <AuthedAccess allowedRoles={['teacher']}>
              <TeacherLayout>
                <TeacherDashboard />
              </TeacherLayout>
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


