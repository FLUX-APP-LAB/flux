import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Radio, 
  Users, 
  Settings, 
  Bell,
  Bookmark,
  TrendingUp,
  Gamepad2,
  Trophy,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  DollarSign,
  User,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/appStore';
import { useWallet } from '../../hooks/useWallet';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { CreateContentModal } from '../create/CreateContentModal';

export const DesktopSidebar: React.FC = () => {
  const { 
    currentUser, 
    setAuthenticated, 
    setCurrentUser,
    desktopSidebarCollapsed,
    setDesktopSidebarCollapsed
  } = useAppStore();
  const { 
    balance, 
    formatWalletAddress, 
    walletAddress, 
    disconnectWallet, 
    isConnected 
  } = useWallet();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const mainNavItems = [
    { id: 'home', path: '/home', icon: Home, label: 'Home', badge: null },
    { id: 'discover', path: '/discover', icon: Search, label: 'Discover', badge: null },
    { id: 'following', path: '/home', icon: Users, label: 'Following', badge: '12' },
    { id: 'streams', path: '/streams', icon: Radio, label: 'Live Streams', badge: null },
  ] as const;

  const secondaryNavItems = [
    { id: 'trending', path: '/trending', icon: TrendingUp, label: 'Trending', badge: null },
    { id: 'gaming', path: '/gaming', icon: Gamepad2, label: 'Gaming Hub', badge: 'New' },
    { id: 'rewards', path: '/rewards', icon: Trophy, label: 'Rewards', badge: null },
    { id: 'saved', path: '/saved', icon: Bookmark, label: 'Saved', badge: null },
  ] as const;

  const bottomNavItems = [
    { id: 'profile', path: '/profile', icon: User, label: 'Profile', badge: null },
    { id: 'notifications', path: '/notifications', icon: Bell, label: 'Notifications', badge: '3' },
    { id: 'settings', path: '/settings', icon: Settings, label: 'Settings', badge: null },
  ] as const;

  const handleNavClick = (item: { id: string; path?: string }) => {
    if (item.id === 'create') {
      setShowCreateModal(true);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handleLogout = async () => {
    await disconnectWallet();
    setAuthenticated(false);
    setCurrentUser(null);
    navigate('/landing');
  };

  const isActiveRoute = (path: string) => {
    if (path === '/home') {
      return location.pathname === '/home' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <motion.div
        initial={{ width: 280 }}
        animate={{ width: desktopSidebarCollapsed ? 80 : 280 }}
        className="hidden lg:flex flex-col h-screen bg-flux-bg-secondary border-r border-flux-bg-tertiary fixed left-0 top-0 z-40"
      >
        {/* Header */}
        <div className="p-6 border-b border-flux-bg-tertiary">
          <div className="flex items-center justify-between">
            {!desktopSidebarCollapsed && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: desktopSidebarCollapsed ? 0 : 1 }}
                className="text-2xl font-bold bg-flux-gradient bg-clip-text text-transparent"
              >
                FLUX
              </motion.div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
              className="text-flux-text-secondary hover:text-flux-text-primary"
            >
              {desktopSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Profile Section */}
        {!desktopSidebarCollapsed && currentUser && (
          <div className="p-4 border-b border-flux-bg-tertiary">
            <div className="flex items-center space-x-3 mb-4">
              <div 
                onClick={() => navigate('/profile')}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Avatar 
                  src={currentUser.avatar} 
                  alt={currentUser.displayName}
                  size="md"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-flux-text-primary font-semibold truncate">
                  {currentUser.displayName}
                </p>
                <p className="text-flux-text-secondary text-sm truncate">
                  @{currentUser.username}
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => setShowCreateModal(true)}
              className="w-full bg-flux-gradient hover:opacity-90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </div>
        )}

        {/* Collapsed Profile Section */}
        {desktopSidebarCollapsed && currentUser && (
          <div className="p-4 border-b border-flux-bg-tertiary flex justify-center">
            <div 
              onClick={() => navigate('/profile')}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Avatar 
                src={currentUser.avatar} 
                alt={currentUser.displayName}
                size="sm"
              />
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Navigation */}
          <div className="p-4">
            {!desktopSidebarCollapsed && (
              <h3 className="text-flux-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                Main
              </h3>
            )}
            <nav className="space-y-1">
              {mainNavItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-left",
                    isActiveRoute(item.path)
                      ? "bg-flux-primary text-white"
                      : "text-flux-text-secondary hover:text-flux-text-primary hover:bg-flux-bg-tertiary"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!desktopSidebarCollapsed && (
                    <motion.div
                      initial={{ opacity: 1 }}
                      animate={{ opacity: desktopSidebarCollapsed ? 0 : 1 }}
                      className="flex items-center justify-between flex-1"
                    >
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="bg-flux-accent-red text-white text-xs px-2 py-1 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </nav>
          </div>

          {/* Secondary Navigation */}
          <div className="p-4 border-t border-flux-bg-tertiary">
            {!desktopSidebarCollapsed && (
              <h3 className="text-flux-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                Explore
              </h3>
            )}
            <nav className="space-y-1">
              {secondaryNavItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-left",
                    isActiveRoute(item.path)
                      ? "bg-flux-primary text-white"
                      : "text-flux-text-secondary hover:text-flux-text-primary hover:bg-flux-bg-tertiary"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!desktopSidebarCollapsed && (
                    <motion.div
                      initial={{ opacity: 1 }}
                      animate={{ opacity: desktopSidebarCollapsed ? 0 : 1 }}
                      className="flex items-center justify-between flex-1"
                    >
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          item.badge === 'New' 
                            ? "bg-flux-accent-green text-white"
                            : "bg-flux-accent-red text-white"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="p-4 border-t border-flux-bg-tertiary">
          <nav className="space-y-1 mb-4">
            {bottomNavItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleNavClick(item)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-left",
                  isActiveRoute(item.path)
                    ? "bg-flux-primary text-white"
                    : "text-flux-text-secondary hover:text-flux-text-primary hover:bg-flux-bg-tertiary"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!desktopSidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: desktopSidebarCollapsed ? 0 : 1 }}
                    className="flex items-center justify-between flex-1"
                  >
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="bg-flux-accent-red text-white text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </motion.div>
                )}
              </motion.button>
            ))}
          </nav>

          {/* Wallet & Logout */}
          <div className="space-y-2">
            {/* Wallet Balance Display */}
            {!desktopSidebarCollapsed && isConnected && balance && (
              <div className="bg-flux-bg-tertiary rounded-lg p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-flux-text-secondary">Balance</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <Wallet className="w-3 h-3 text-flux-text-secondary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-3 h-3 text-flux-accent-gold" />
                    <span className="text-flux-text-primary font-medium">
                      {balance.appCoinBalance || 0}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-flux-primary" />
                    <span className="text-flux-text-primary font-medium">
                      {balance.bitsBalance || 0}
                    </span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-flux-bg-secondary">
                  <p className="text-xs text-flux-text-secondary">
                    {formatWalletAddress(walletAddress ?? undefined)}
                  </p>
                </div>
              </div>
            )}

            {/* Wallet Connection Status for Collapsed Sidebar */}
            {!desktopSidebarCollapsed && !isConnected && (
              <div className="bg-flux-bg-tertiary rounded-lg p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-flux-text-secondary">Wallet</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <Wallet className="w-3 h-3 text-flux-text-secondary" />
                  </div>
                </div>
                <p className="text-xs text-flux-text-secondary">Not connected</p>
              </div>
            )}

            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => navigate('/wallet')}
            >
              <Wallet className="w-4 h-4 mr-2" />
              {!desktopSidebarCollapsed && 'Wallet'}
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-flux-accent-red hover:text-flux-accent-red hover:bg-flux-accent-red/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {!desktopSidebarCollapsed && 'Sign Out'}
            </Button>
          </div>
        </div>
      </motion.div>

      <CreateContentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
};