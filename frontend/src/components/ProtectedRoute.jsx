import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingIndicator from './LoadingIndicator';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingIndicator message="Verifying campus authentication session..." />;
  }

  if (!isAuthenticated) {
    // Redirect to login page and preserve return target location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
