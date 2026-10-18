import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, token, isAuthenticated, loading, isInitialized } = useSelector((state) => state.auth);
  const location = useLocation();

  const storedToken = token || localStorage.getItem('token');
  const storedRole = (user?.role || role || localStorage.getItem('role') || '').toLowerCase();

  // 1. If loading or auth profile restoration is in progress while token exists -> Show explicit loading UI
  if (storedToken && (loading || (!user && !isInitialized))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-amber-500" size={36} />
          <p className="text-sm font-bold text-slate-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // 2. If no token exists or token is invalid -> Redirect to unified login page
  if (!storedToken || (!isAuthenticated && isInitialized)) {
    return <Navigate to="/login" replace />;
  }

  // 3. Role authorization check
  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
    if (!normalizedAllowed.includes(storedRole)) {
      if (storedRole === 'admin') return <Navigate to="/admin" replace />;
      if (storedRole === 'alumni') return <Navigate to="/alumni/dashboard" replace />;
      if (storedRole === 'student') return <Navigate to="/student/dashboard" replace />;
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
