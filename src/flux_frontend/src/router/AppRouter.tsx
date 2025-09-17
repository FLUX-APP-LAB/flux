import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomeFeed } from '../components/screens/HomeFeed';
import { DiscoverScreen } from '../components/screens/DiscoverScreen';
import { StreamDashboard } from '../components/screens/StreamDashboard';
import { StreamManagementDashboard } from '../components/screens/StreamManagementDashboard';
import { StreamViewer } from '../components/screens/StreamViewer';
import { LiveStreamList } from '../components/screens/LiveStreamList';
import { UserProfile } from '../components/screens/UserProfile';
import { WalletScreen } from '../components/screens/WalletScreen';
import { TrendingScreen } from '../components/screens/TrendingScreen';
import { GamingScreen } from '../components/screens/GamingScreen';
import { RewardsScreen } from '../components/screens/RewardsScreen';
import { SavedScreen } from '../components/screens/SavedScreen';
import { NotificationsScreen } from '../components/screens/NotificationsScreen';
import { SettingsScreen } from '../components/screens/SettingsScreen';
import { LandingPage } from '../components/auth/LandingPage';
import { SignupPage } from '../components/auth/SignupPage';
import { LiveStreamDemo } from '../components/stream/LiveStreamDemo';
import { LiveStreamPage } from '../components/stream/LiveStreamPage';
import { ProtectedRoute } from './ProtectedRoute';
import { MainLayout } from '../components/layouts/MainLayout';

// Detect if we're in a dfx deployed environment
const isDfxDeployed = () => {
  const isDeployed = window.location.hostname.includes('.localhost') && 
         window.location.port === '4943';
  console.log('Router detection:', {
    hostname: window.location.hostname,
    port: window.location.port,
    isDfxDeployed: isDeployed,
    routerType: isDeployed ? 'HashRouter' : 'BrowserRouter'
  });
  return isDeployed;
};

// Choose router based on environment
const Router = isDfxDeployed() ? HashRouter : BrowserRouter;

export const AppRouter: React.FC = () => {
  console.log('AppRouter rendering with current location:', window.location.href);
  
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage onBack={() => window.history.back()} />} />
        
        {/* Protected routes with main layout */}
        <Route path="/" element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<HomeFeed />} />
            <Route path="discover" element={<DiscoverScreen />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="wallet" element={<WalletScreen />} />
            <Route path="trending" element={<TrendingScreen />} />
            <Route path="gaming" element={<GamingScreen />} />
            <Route path="rewards" element={<RewardsScreen />} />
            <Route path="saved" element={<SavedScreen />} />
            <Route path="notifications" element={<NotificationsScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            
            {/* Stream routes */}
            <Route path="streams" element={<LiveStreamList />} />
            <Route path="stream-dashboard" element={<StreamDashboard />} />
            <Route path="live-stream" element={<LiveStreamPage />} />
            <Route path="go-live" element={<LiveStreamPage />} />
            <Route path="manage-stream/:streamId" element={<StreamManagementDashboard />} />
          </Route>
          
          {/* Full-screen stream viewer without main layout */}
          <Route path="stream/:streamId" element={<StreamViewer />} />
        </Route>
        
        {/* Fallback - redirect to landing for unauthenticated users */}
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </Router>
  );
};
