import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import ScoutLogin from './ScoutLogin';
import ScoutRegister from './ScoutRegister';
import ScoutPortalLayout from './ScoutPortalLayout';
import ScoutHome from './ScoutHome';
import ScoutJobDetail from './ScoutJobDetail';
import ScoutActiveJob from './ScoutActiveJob';
import ScoutSubmitReview from './ScoutSubmitReview';
import ScoutJobResult from './ScoutJobResult';
import ScoutEarnings from './ScoutEarnings';
import ScoutProfile from './ScoutProfile';
import ScoutPerformance from './ScoutPerformance';
import { ScoutProtectedRoute } from './ScoutProtectedRoute';

function ScoutRoutes() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <ScoutLogin />} />
      <Route path="/invite/:token" element={<ScoutRegister />} />
      <Route element={
        <ScoutProtectedRoute>
          <ScoutPortalLayout />
        </ScoutProtectedRoute>
      }>
        <Route path="/" element={<ScoutHome />} />
        <Route path="/jobs/:id" element={<ScoutJobDetail />} />
        <Route path="/jobs/:id/execute" element={<ScoutActiveJob />} />
        <Route path="/jobs/:id/submit" element={<ScoutSubmitReview />} />
        <Route path="/jobs/:id/result" element={<ScoutJobResult />} />
        <Route path="/earnings" element={<ScoutEarnings />} />
        <Route path="/performance" element={<ScoutPerformance />} />
        <Route path="/profile" element={<ScoutProfile />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
    </Routes>
  );
}

export default function ScoutPortalApp() {
  return (
    <AuthProvider>
      <ScoutRoutes />
    </AuthProvider>
  );
}
