import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { DialogProvider } from './context/DialogContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './components/common/Login';
import Layout from './components/common/Layout';
import { ThemeProvider } from './components/theme-provider';
import TermsModal from './components/common/TermsModal';
import PageSkeleton from './components/common/PageSkeleton';
import { Toaster } from "@/components/ui/toaster";

// Admin Components - Lazy Loaded
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));
const UserManagement = lazy(() => import('./components/Admin/UserManagement'));
const AdminPaymentPage = lazy(() => import('./components/Admin/AdminPaymentPage'));
const AcceptProjectPage = lazy(() => import('./components/Admin/AcceptProjectPage'));
const AdminProjectPage = lazy(() => import('./components/Admin/AdminProjectPage'));
const ActivityLogPage = lazy(() => import('./components/Admin/ActivityLogPage'));
const TalentDirectory = lazy(() => import('./components/Admin/TalentDirectory'));

// Editor Components - Lazy Loaded
const EditorDashboard = lazy(() => import('./components/Editor/EditorDashboard'));
const UploadWorkPage = lazy(() => import('./components/Editor/UploadWorkPage'));
const EditorPaymentPage = lazy(() => import('./components/Editor/EditorPaymentPage'));
const SchedulePage = lazy(() => import('./components/common/SchedulePage'));

// Client Components - Lazy Loaded
const ClientDashboard = lazy(() => import('./components/Client/ClientDashboard'));
const ClientPaymentPage = lazy(() => import('./components/Client/ClientPaymentPage'));

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <>
      <TermsModal />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="payments" element={<AdminPaymentPage />} />
                    <Route path="accept-project/:projectId" element={<AcceptProjectPage />} />
                    <Route path="project/:projectId" element={<AdminProjectPage />} />
                    <Route path="activity-logs" element={<ActivityLogPage />} />
                    <Route path="talent-pool" element={<TalentDirectory />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/editor/*"
            element={
              <ProtectedRoute allowedRoles={['editor']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard" element={<EditorDashboard />} />
                    <Route path="payments" element={<EditorPaymentPage />} />
                    <Route path="schedule" element={<SchedulePage />} />
                    <Route path="upload-work/:workBreakdownId" element={<UploadWorkPage />} />
                    <Route path="*" element={<Navigate to="/editor/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/client/*"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard" element={<ClientDashboard />} />
                    <Route path="payments" element={<ClientPaymentPage />} />
                    <Route path="*" element={<Navigate to="/client/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              user ? (
                user.role === 'admin' ? (
                  <Navigate to="/admin/dashboard" replace />
                ) : user.role === 'editor' ? (
                  <Navigate to="/editor/dashboard" replace />
                ) : (
                  <Navigate to="/client/dashboard" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

function App() {
  return (
    <Router>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <SocketProvider>
            <DialogProvider>
              <AppRoutes />
              <Toaster />
            </DialogProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

