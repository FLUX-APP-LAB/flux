import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Radio, 
  Users, 
  User, 
  Settings, 
  Bell,
  Bookmark,
  TrendingUp,
  Video,
  Gamepad2,
  Trophy,
  Wallet,
  LogOut,
  Plus,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/appStore';
import { useWallet } from '../../hooks/useWallet';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { CreateContentModal } from '../create/CreateContentModal';

export const TabletNavigation: React.FC = () => {
  const { currentUser, setAuthenticated, setCurrentUser } = useAppStore();
  const { disconnectWallet } = useWallet();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
    setIsMenuOpen(false);
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
      {/* Tablet Header Navigation */}
      <div className="hidden md:flex lg:hidden fixed top-0 left-0 right-0 h-16 bg-flux-bg-secondary border-b border-flux-bg-tertiary z-50">
        <div className="flex items-center justify-between w-full px-6">
          {/* Logo */}
          <div className="text-xl font-bold bg-flux-gradient bg-clip-text text-transparent">
            FLUX
          </div>

          {/* Main Navigation */}
          <nav className="flex items-center space-x-6">
            {mainNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                  isActiveRoute(item.path)
                    ? "bg-flux-primary text-white"
                    : "text-flux-text-secondary hover:text-flux-text-primary hover:bg-flux-bg-tertiary"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="bg-flux-accent-red text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Create Button */}
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="bg-flux-gradient hover:opacity-90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>

            {/* Profile */}
            {currentUser && (
              <button 
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-flux-bg-tertiary"
              >
                <Avatar src={currentUser.avatar} alt={currentUser.displayName} size="sm" />
              </button>
            )}

            {/* Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Menu Overlay */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40 md:block lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          <motion.div
            initial={{ translateX: '100%' }}
            animate={{ translateX: 0 }}
            exit={{ translateX: '100%' }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-flux-bg-secondary border-l border-flux-bg-tertiary overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-flux-text-primary">Menu</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Secondary Navigation */}
              <div className="mb-6">
                <h3 className="text-flux-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                  Explore
                </h3>
                <nav className="space-y-1">
                  {secondaryNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item)}
                      className={cn(
                        "w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-left",
                        isActiveRoute(item.path)
                          ? "bg-flux-primary text-white"
                          : "text-flux-text-secondary hover:text-flux-text-primary hover:bg-flux-bg-tertiary"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full ml-auto",
                          item.badge === 'New' 
                            ? "bg-flux-accent-green text-white"
                            : "bg-flux-accent-red text-white"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Bottom Navigation */}
              <div className="mb-6">
                <h3 className="text-flux-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                  Account
                </h3>
                <nav className="space-y-1">
                  {bottomNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item)}
                      className={cn(
                        "w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-left",
                        isActiveRoute(item.path)
                          ? "bg-flux-primary text-white"
                          : "text-flux-text-secondary hover:text-flux-text-primary hover:bg-flux-bg-tertiary"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="bg-flux-accent-red text-white text-xs px-2 py-1 rounded-full ml-auto">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Bottom Actions */}
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => navigate('/wallet')}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Wallet
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start text-flux-accent-red hover:text-flux-accent-red hover:bg-flux-accent-red/10"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      <CreateContentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
};