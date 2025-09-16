import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileNavigation } from '../navigation/MobileNavigation';
import { DesktopSidebar } from '../navigation/DesktopSidebar';
import { TabletNavigation } from '../navigation/TabletNavigation';
import { useAppStore } from '../../store/appStore';

export const MainLayout: React.FC = () => {
  const { desktopSidebarCollapsed } = useAppStore();

  return (
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};