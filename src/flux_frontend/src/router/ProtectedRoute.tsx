import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, currentUser } = useAppStore();

  // If not authenticated, redirect to landing page
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/landing" replace />;
  }

  // If authenticated, render the child routes
  return <Outlet />;
};