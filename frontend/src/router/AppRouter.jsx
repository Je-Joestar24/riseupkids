import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthLogin from '../pages/auth/AuthLogin';
import ParentsChild from '../pages/parents/ParentsChild';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminLayout from '../layouts/AdminLayout';
import AuthedAccess from './access/AuthedAccess';
import UnAuthed from './access/UnAuthed';

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


