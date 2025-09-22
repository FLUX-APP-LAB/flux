import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useWallet } from '../hooks/useWallet';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useWallet();
  const { currentUser } = useAppStore();

  // If not authenticated, redirect to landing page
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If authenticated but no user profile, redirect to signup
  if (!currentUser) {
    return <Navigate to="/signup" replace />;
  }

  // If authenticated and has profile, render the child routes
  return <Outlet />;
};