import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './components/common/Login';
import Layout from './components/common/Layout';

// Admin Components
import AdminDashboard from './components/Admin/AdminDashboard';
import UserManagement from './components/Admin/UserManagement';
import AdminPaymentPage from './components/Admin/AdminPaymentPage';
import AcceptProjectPage from './components/Admin/AcceptProjectPage';
import AdminProjectPage from './components/Admin/AdminProjectPage';
import ActivityLogPage from './components/Admin/ActivityLogPage';

// Editor Components
import EditorDashboard from './components/Editor/EditorDashboard';
import UploadWorkPage from './components/Editor/UploadWorkPage';
import EditorPaymentPage from './components/Editor/EditorPaymentPage';

// Client Components
import ClientDashboard from './components/Client/ClientDashboard';
import ClientPaymentPage from './components/Client/ClientPaymentPage';
import WorkView from './components/Client/WorkView'; // Added if missing, but checking... WorkView is used inside ClientDashboard usually. Route-wise it's not here.


import TermsModal from './components/common/TermsModal';

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="spinner" style={{ marginTop: '3rem' }}></div>
    );
  }

  return (
    <>
      <TermsModal />
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
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <DialogProvider>
          <AppRoutes />
        </DialogProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

