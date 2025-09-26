import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Video, Radio, Upload, Camera } from 'lucide-react';
import { Button } from '../ui/Button';
import { VideoUpload } from './VideoUpload';
import { LiveStreamSetup } from './LiveStreamSetup';

interface CreateContentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateContentModal: React.FC<CreateContentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'stream'>('upload');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 pb-24 md:pb-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-flux-bg-secondary rounded-2xl w-full max-w-2xl max-h-[80vh] md:max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-flux-bg-tertiary flex-shrink-0">
            <h2 className="text-lg md:text-xl font-bold text-flux-text-primary">Create Content</h2>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-flux-bg-tertiary flex-shrink-0">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 md:py-4 px-3 md:px-6 transition-colors ${
                activeTab === 'upload'
                  ? 'text-flux-primary border-b-2 border-flux-primary bg-flux-primary/5'
                  : 'text-flux-text-secondary hover:text-flux-text-primary'
              }`}
            >
              <Video className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Upload Video</span>
            </button>
            <button
              onClick={() => setActiveTab('stream')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 md:py-4 px-3 md:px-6 transition-colors ${
                activeTab === 'stream'
                  ? 'text-flux-primary border-b-2 border-flux-primary bg-flux-primary/5'
                  : 'text-flux-text-secondary hover:text-flux-text-primary'
              }`}
            >
              <Radio className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Go Live</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
            {activeTab === 'upload' ? (
              <VideoUpload onClose={onClose} />
            ) : (
              <LiveStreamSetup onClose={onClose} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};