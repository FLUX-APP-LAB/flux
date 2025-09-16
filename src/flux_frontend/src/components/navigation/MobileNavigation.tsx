import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Plus, Users, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CreateContentModal } from '../create/CreateContentModal';

export const MobileNavigation: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', path: '/home', icon: Home, label: 'Home' },
    { id: 'discover', path: '/discover', icon: Search, label: 'Discover' },
    { id: 'create', path: '', icon: Plus, label: 'Create', isCreate: true },
    { id: 'following', path: '/home', icon: Users, label: 'Following' },
    { id: 'profile', path: '/profile', icon: User, label: 'Profile' },
  ];

  const handleNavClick = (item: { id: string; path?: string; isCreate?: boolean }) => {
    if (item.isCreate) {
      setShowCreateModal(true);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const isActiveRoute = (path: string) => {
    if (path === '/home') {
      return location.pathname === '/home' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-flux-bg-secondary/95 backdrop-blur-lg border-t border-flux-bg-tertiary z-50 md:hidden">
        <div className="flex items-center justify-around py-2 px-4">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors",
                item.isCreate
                  ? "bg-flux-gradient text-white"
                  : item.path && isActiveRoute(item.path)
                  ? "text-flux-primary"
                  : "text-flux-text-secondary hover:text-flux-text-primary"
              )}
            >
              <item.icon className={cn(
                "w-6 h-6",
                item.isCreate && "w-7 h-7"
              )} />
              <span className="text-xs font-medium">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <CreateContentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
};