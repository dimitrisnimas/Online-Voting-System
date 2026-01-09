import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import CreateElection from './pages/admin/CreateElection';
import ElectionDetails from './pages/admin/ElectionDetails';
import PublicVote from './pages/public/Vote';
import PublicResults from './pages/public/Results';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>

        <Routes>
          {/* Public Routes */}
          <Route path="/vote/:slug" element={<PublicVote />} />
          <Route path="/results/:slug" element={<PublicResults />} />
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/create" element={
            <ProtectedRoute>
              <CreateElection />
            </ProtectedRoute>
          } />
          <Route path="/admin/elections/:id" element={
            <ProtectedRoute>
              <ElectionDetails />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

