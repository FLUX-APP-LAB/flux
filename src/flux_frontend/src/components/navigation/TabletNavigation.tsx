import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { CreateContentModal } from '../create/CreateContentModal';

export const TabletNavigation: React.FC = () => {
  const { activePage, setActivePage, currentUser, setAuthenticated, setCurrentUser } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainNavItems = [
    { id: 'home', icon: Home, label: 'Home', badge: null },
    { id: 'discover', icon: Search, label: 'Discover', badge: null },
    { id: 'following', icon: Users, label: 'Following', badge: '12' },
    { id: 'stream', icon: Radio, label: 'Live Streams', badge: null },
  ] as const;

  const secondaryNavItems = [
    { id: 'trending', icon: TrendingUp, label: 'Trending', badge: null },
    { id: 'gaming', icon: Gamepad2, label: 'Gaming Hub', badge: 'New' },
    { id: 'rewards', icon: Trophy, label: 'Rewards', badge: null },
    { id: 'saved', icon: Bookmark, label: 'Saved', badge: null },
  ] as const;

  const bottomNavItems = [
    { id: 'notifications', icon: Bell, label: 'Notifications', badge: '3' },
    { id: 'settings', icon: Settings, label: 'Settings', badge: null },
  ] as const;

  const handleNavClick = (itemId: string) => {
    if (itemId === 'create') {
      setShowCreateModal(true);
    } else {
      setActivePage(itemId as any);
    }
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setCurrentUser(null);
    setActivePage('home');
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Top Navigation Bar for Tablets */}
      <div className="hidden md:flex lg:hidden fixed top-0 left-0 right-0 bg-flux-bg-secondary/95 backdrop-blur-lg border-b border-flux-bg-tertiary z-50 h-16">
        <div className="flex items-center justify-between w-full px-4">
          {/* Left side - Logo and Menu */}
          <div className="flex items-center space-x-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="text-xl font-bold bg-flux-gradient bg-clip-text text-transparent">
              FLUX
            </div>
          </div>

          {/* Center - Main Navigation */}
          <div className="flex items-center space-x-1 bg-flux-bg-tertiary rounded-lg p-1">
            {mainNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-md transition-colors relative",
                  activePage === item.id
                    ? "bg-flux-primary text-white"
                    : "text-flux-text-secondary hover:text-flux-text-primary hover:bg-flux-bg-secondary"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:block">{item.label}</span>
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-flux-accent-red text-white text-xs px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Right side - Create, Profile, Notifications */}
          <div className="flex items-center space-x-3">
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="bg-flux-gradient hover:opacity-90 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:block">Create</span>
            </Button>

            <Button size="sm" variant="ghost" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-flux-accent-red text-white text-xs px-1.5 py-0.5 rounded-full">
                3
              </span>
            </Button>

            <button onClick={() => setActivePage('profile')}>
              <Avatar
                src={currentUser?.avatar}
                alt={currentUser?.displayName || ''}
                size="sm"
                isLive={currentUser?.isLiveStreaming}
                tier={currentUser?.tier}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out Menu for Tablets */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isMenuOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="hidden md:block lg:hidden fixed top-16 left-0 bottom-0 w-80 bg-flux-bg-secondary border-r border-flux-bg-tertiary z-40 overflow-y-auto"
      >
        {/* User Profile Section */}
        <div className="p-6 border-b border-flux-bg-tertiary">
          <div className="flex items-center space-x-4">
            <Avatar
              src={currentUser?.avatar}
              alt={currentUser?.displayName || ''}
              size="lg"
              isLive={currentUser?.isLiveStreaming}
              tier={currentUser?.tier}
            />
            <div className="flex-1 min-w-0">
              <p className="text-flux-text-primary font-semibold truncate">
                {currentUser?.displayName}
              </p>
              <p className="text-flux-text-secondary text-sm truncate">
                @{currentUser?.username}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-flux-text-secondary">
                <span>{currentUser?.followerCount?.toLocaleString()} followers</span>
                <span>{currentUser?.followingCount?.toLocaleString()} following</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="p-4">
          {/* Explore Section */}
          <div className="mb-6">
            <h3 className="text-flux-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
              Explore
            </h3>
            <nav className="space-y-1">
              {secondaryNavItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-left",
                    activePage === item.id
                      ? "bg-flux-primary text-white"
                      : "text-flux-text-secondary hover:text-flux-text-primary hover:bg-flux-bg-tertiary"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <div className="flex items-center justify-between flex-1">
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
                  </div>
                </motion.button>
              ))}
            </nav>
          </div>

          {/* Settings Section */}
          <div className="mb-6">
            <h3 className="text-flux-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
              Settings
            </h3>
            <nav className="space-y-1">
              {bottomNavItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-left",
                    activePage === item.id
                      ? "bg-flux-primary text-white"
                      : "text-flux-text-secondary hover:text-flux-text-primary hover:bg-flux-bg-tertiary"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <div className="flex items-center justify-between flex-1">
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="bg-flux-accent-red text-white text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </motion.button>
              ))}
            </nav>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => handleNavClick('wallet')}
            >
              <Wallet className="w-4 h-4 mr-3" />
              Wallet
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-flux-accent-red hover:text-flux-accent-red hover:bg-flux-accent-red/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Overlay */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="hidden md:block lg:hidden fixed inset-0 bg-black/50 z-30 top-16"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <CreateContentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
};