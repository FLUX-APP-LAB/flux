import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Plus, Users, User, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CreateContentModal } from '../create/CreateContentModal';

export const MobileNavigation: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', path: '/app/home', icon: Home, label: 'Home' },
    { id: 'discover', path: '/app/discover', icon: Search, label: 'Discover' },
    { id: 'stream-dashboard', path: '/app/go-live', icon: Zap, label: 'Go Live' },
    { id: 'create', path: '', icon: Plus, label: 'Create', isCreate: true },
    { id: 'profile', path: '/app/profile', icon: User, label: 'Profile' },
  ];

  const handleNavClick = (item: { id: string; path?: string; isCreate?: boolean }) => {
    if (item.isCreate) {
      setShowCreateModal(true);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const isActiveRoute = (path: string) => {
    if (path === '/app/home') {
      return location.pathname === '/app/home' || location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-flux-bg-secondary/98 backdrop-blur-lg border-t border-flux-bg-tertiary z-50 md:hidden safe-area-pb">
        <div className="flex items-center justify-around py-3 px-2">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors min-w-[60px]",
                item.isCreate
                  ? "bg-flux-gradient text-white shadow-lg"
                  : item.path && isActiveRoute(item.path)
                  ? "text-flux-primary bg-flux-primary/10"
                  : "text-flux-text-secondary hover:text-flux-text-primary hover:bg-flux-bg-tertiary/50"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                item.isCreate && "w-6 h-6"
              )} />
              <span className="text-xs font-medium leading-tight">{item.label}</span>
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