import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no role restrictions, allow access to any authenticated user
  if (allowedRoles.length === 0) {
    return children;
  }

  // Check if user has required role
  if (!allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center glass-card p-8 rounded-xl max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Access Denied
          </h2>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            You don&apos;t have permission to access this page. Required role(s): {allowedRoles.join(', ')}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Your role: {user?.role || 'Unknown'}
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default RoleProtectedRoute;