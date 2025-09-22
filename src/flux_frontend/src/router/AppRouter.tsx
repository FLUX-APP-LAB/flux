import React, { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { useWallet } from '../hooks/useWallet';
import { useAppStore } from '../store/appStore';

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

// Component to handle navigation after auth state is determined
function AuthNavigationHandler({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useWallet();
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log('AuthNavigationHandler effect:', { 
      isAuthenticated, 
      currentUser: currentUser ? 'exists' : currentUser === null ? 'null' : 'undefined',
      currentUserData: currentUser,
      currentPath: window.location.pathname
    });
    
    // ONLY handle navigation if user data is fully loaded (not undefined)
    if (currentUser === undefined) {
      console.log('User data still loading, skipping navigation logic');
      return;
    }
    
    if (isAuthenticated && currentUser !== undefined) {
      if (currentUser === null) {
        // User is authenticated but has no profile - redirect to signup
        console.log('Authenticated user without profile, redirecting to signup');
        navigate('/signup', { replace: true });
      } else if (currentUser && window.location.pathname === '/signup') {
        // User has profile but is on signup page - redirect to app
        console.log('Authenticated user with profile on signup page, redirecting to app');
        navigate('/app/home', { replace: true });
      }
    }
    
    // Handle unauthenticated users on protected routes
    if (!isAuthenticated && window.location.pathname.startsWith('/app')) {
      console.log('Not authenticated but on protected route, redirecting to landing');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate]);
  
  return <>{children}</>;
}

// Component that redirects based on authentication state
function AuthAwareRedirect() {
  const { isAuthenticated } = useWallet();
  const { currentUser } = useAppStore();
  
  console.log('AuthAwareRedirect:', { 
    isAuthenticated, 
    currentUser: currentUser ? 'exists' : currentUser === null ? 'null' : 'undefined' 
  });
  
  // Wait for currentUser to be determined before any navigation
  if (isAuthenticated && currentUser === undefined) {
    console.log('Still loading user data, waiting...');
    return null; // Don't navigate until we know the user state
  }
  
  if (isAuthenticated && currentUser) {
    return <Navigate to="/app/home" replace />;
  } else if (isAuthenticated && currentUser === null) {
    console.log('Authenticated user with no profile, redirecting to signup');
    return <Navigate to="/signup" replace />;
  } else {
    console.log('Not authenticated, staying on current page');
    return null; // Don't redirect unauthenticated users
  }
}

export const AppRouter: React.FC = () => {
  console.log('AppRouter rendering with current location:', window.location.href);
  
  return (
    <Router>
      <AuthNavigationHandler>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignupPage onBack={() => window.history.back()} />} />
          
          {/* Protected routes with main layout */}
          <Route path="/app" element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route index element={<Navigate to="/app/home" replace />} />
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
          
          {/* Fallback - redirect based on auth state */}
          <Route path="*" element={<AuthAwareRedirect />} />
        </Routes>
      </AuthNavigationHandler>
    </Router>
  );
};
