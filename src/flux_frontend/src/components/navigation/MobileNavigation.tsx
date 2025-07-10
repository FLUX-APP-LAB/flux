import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Plus, Users, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/appStore';
import { CreateContentModal } from '../create/CreateContentModal';

export const MobileNavigation: React.FC = () => {
  const { activePage, setActivePage } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const navItems = [
    { id: 'home' as const, icon: Home, label: 'Home' },
    { id: 'discover' as const, icon: Search, label: 'Discover' },
    { id: 'create' as const, icon: Plus, label: 'Create', isCreate: true },
    { id: 'following' as const, icon: Users, label: 'Following' },
    { id: 'profile' as const, icon: User, label: 'Profile' },
  ];

  const handleNavClick = (itemId: string) => {
    if (itemId === 'create') {
      setShowCreateModal(true);
    } else {
      setActivePage(itemId as any);
    }
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
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors",
                item.isCreate
                  ? "bg-flux-gradient text-white"
                  : activePage === item.id
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