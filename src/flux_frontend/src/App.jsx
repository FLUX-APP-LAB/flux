import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { HomeFeed } from './components/screens/HomeFeed';
import { DiscoverScreen } from './components/screens/DiscoverScreen';
import { StreamDashboard } from './components/screens/StreamDashboard';
import { UserProfile } from './components/screens/UserProfile';
import { WalletScreen } from './components/screens/WalletScreen';
import { TrendingScreen } from './components/screens/TrendingScreen';
import { GamingScreen } from './components/screens/GamingScreen';
import { RewardsScreen } from './components/screens/RewardsScreen';
import { SavedScreen } from './components/screens/SavedScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { MobileNavigation } from './components/navigation/MobileNavigation';
import { DesktopSidebar } from './components/navigation/DesktopSidebar';
import { TabletNavigation } from './components/navigation/TabletNavigation';
import { LandingPage } from './components/auth/LandingPage';
import { WalletProvider } from './contexts/WalletContext';
import { useAppStore } from './store/appStore';

function App() {
  const { activePage, theme, isAuthenticated, desktopSidebarCollapsed } = useAppStore();

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const renderCurrentScreen = () => {
    switch (activePage) {
      case 'home':
      case 'following':
        return <HomeFeed />;
      case 'discover':
        return <DiscoverScreen />;
      case 'stream':
        return <StreamDashboard />;
      case 'profile':
        return <UserProfile />;
      case 'wallet':
        return <WalletScreen />;
      case 'trending':
        return <TrendingScreen />;
      case 'gaming':
        return <GamingScreen />;
      case 'rewards':
        return <RewardsScreen />;
      case 'saved':
        return <SavedScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeFeed />;
    }
  };

  // Show landing page if user is not authenticated
  if (!isAuthenticated) {
    return (
      <WalletProvider>
        <div className="min-h-screen bg-flux-bg-primary text-flux-text-primary">
          <LandingPage />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                color: theme === 'dark' ? '#ffffff' : '#0f172a',
                border: theme === 'dark' ? '1px solid #262626' : '1px solid #e2e8f0',
              },
            }}
          />
        </div>
      </WalletProvider>
    );
  }

  return (
    <WalletProvider>
      <div className="min-h-screen bg-flux-bg-primary text-flux-text-primary">
        {/* Desktop Navigation */}
        <DesktopSidebar />
        
        {/* Tablet Navigation */}
        <TabletNavigation />
        
        {/* Main Content */}
        <div className={`transition-all duration-300 ${
          desktopSidebarCollapsed ? 'lg:ml-[80px]' : 'lg:ml-[280px]'
        } md:ml-0`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="min-h-screen"
            >
              {renderCurrentScreen()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Navigation */}
        <MobileNavigation />
        
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
              color: theme === 'dark' ? '#ffffff' : '#0f172a',
              border: theme === 'dark' ? '1px solid #262626' : '1px solid #e2e8f0',
            },
          }}
        />
      </div>
    </WalletProvider>
  );
}

export default App;