import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User } from 'lucide-react';
import { VideoPlayer } from '../video/VideoPlayer';
import { useAppStore } from '../../store/appStore';
import { generateMockData } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';

export const HomeFeed: React.FC = () => {
  const { videoFeed, currentVideoIndex, setVideoFeed, setCurrentVideoIndex, currentUser, setActivePage, activePage } = useAppStore();
  const [feedType, setFeedType] = useState<'foryou' | 'following' | 'trending'>('foryou');

  useEffect(() => {
    const { mockVideos } = generateMockData();
    setVideoFeed(mockVideos);
  }, [setVideoFeed]);

  // Set feed type based on active page
  useEffect(() => {
    if (activePage === 'following') {
      setFeedType('following');
    } else if (activePage === 'discover') {
      setFeedType('trending');
    } else {
      setFeedType('foryou');
    }
  }, [activePage]);

  const handleVideoEnd = () => {
    if (currentVideoIndex < videoFeed.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const videoHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    const newIndex = Math.round(scrollTop / videoHeight);
    
    if (newIndex !== currentVideoIndex && newIndex < videoFeed.length) {
      setCurrentVideoIndex(newIndex);
    }
  };

  const feedTabs = [
    { id: 'foryou', label: 'For You' },
    { id: 'following', label: 'Following' },
    { id: 'trending', label: 'Trending' },
  ] as const;

  return (
    <div className="h-screen bg-flux-bg-primary overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between p-4 pt-12">
          <div className="flex items-center space-x-4">
            {feedTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setFeedType(tab.id);
                  if (tab.id === 'following') {
                    setActivePage('following');
                  } else if (tab.id === 'trending') {
                    setActivePage('discover');
                  } else {
                    setActivePage('home');
                  }
                }}
                className={`text-white font-semibold transition-all duration-200 ${
                  feedType === tab.id
                    ? 'text-white border-b-2 border-white pb-1'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <Button size="sm" variant="ghost">
              <Search className="w-5 h-5 text-white" />
            </Button>
            <Button size="sm" variant="ghost">
              <Bell className="w-5 h-5 text-white" />
            </Button>
            <button onClick={() => setActivePage('profile')}>
              {currentUser ? (
                <Avatar
                  src={currentUser.avatar}
                  alt={currentUser.displayName}
                  size="sm"
                />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Video Feed */}
      <div
        className="h-full snap-y snap-mandatory overflow-y-scroll"
        onScroll={handleScroll}
      >
        <AnimatePresence mode="wait">
          {videoFeed.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-screen snap-start"
            >
              <VideoPlayer
                video={video}
                isActive={index === currentVideoIndex}
                onVideoEnd={handleVideoEnd}
                className="w-full h-full"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Loading indicator for infinite scroll */}
      {videoFeed.length > 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white/50 text-sm">
          {currentVideoIndex + 1} / {videoFeed.length}
        </div>
      )}
    </div>
  );
};