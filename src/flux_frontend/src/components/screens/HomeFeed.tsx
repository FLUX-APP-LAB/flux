import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User } from 'lucide-react';
import { VideoPlayer } from '../video/VideoPlayer';
import { useAppStore } from '../../store/appStore';
import { generateMockData } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { VideoService } from '../../lib/videoService';
import { useWallet } from '../../hooks/useWallet';

export const HomeFeed: React.FC = () => {
  const { videoFeed, currentVideoIndex, setVideoFeed, setCurrentVideoIndex, currentUser, setActivePage, activePage } = useAppStore();
  const [feedType, setFeedType] = useState<'foryou' | 'following' | 'trending'>('foryou');
  const [isLoading, setIsLoading] = useState(true);
  const { newAuthActor } = useWallet();

  useEffect(() => {
    const loadVideos = async () => {
      setIsLoading(true);
      try {
        if (newAuthActor) {
          console.log('Loading videos from backend using VideoService...');
          const videoService = new VideoService(newAuthActor);
          
          let videos;
          if (feedType === 'trending') {
            videos = await videoService.getTrendingVideos();
          } else if (feedType === 'following') {
            // For now, load all videos - could be enhanced to filter by followed users
            videos = await videoService.getAllVideos();
          } else {
            // For You feed - load all videos
            videos = await videoService.getAllVideos();
          }
          
          console.log(`Loaded ${videos.length} videos from backend for feed type: ${feedType}`);
          setVideoFeed(videos);
        } else {
          console.log('No actor available, using mock data...');
          const { mockVideos } = generateMockData();
          setVideoFeed(mockVideos);
        }
      } catch (error) {
        console.error('Error loading videos:', error);
        // Fallback to mock data on error
        const { mockVideos } = generateMockData();
        setVideoFeed(mockVideos);
      } finally {
        setIsLoading(false);
      }
    };

    loadVideos();
  }, [setVideoFeed, newAuthActor, feedType]);

  // Set feed type based on active page
  useEffect(() => {
    if (activePage === 'following') {
      setFeedType('following');
    } else if (activePage === 'discover' || activePage === 'trending') {
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
      {isLoading ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/70">Loading videos...</p>
          </div>
        </div>
      ) : videoFeed.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-white/70 text-lg mb-2">No videos available</p>
            <p className="text-white/50 text-sm">Upload some videos to get started!</p>
          </div>
        </div>
      ) : (
        <div
          className="h-full snap-y snap-mandatory overflow-y-scroll"
          onScroll={handleScroll}
        >
          {videoFeed.map((video, index) => (
            <div
              key={`video-${video.id}`}
              className="h-screen snap-start"
            >
              <VideoPlayer
                video={video}
                isActive={index === currentVideoIndex}
                onVideoEnd={handleVideoEnd}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      )}

      {/* Loading indicator for infinite scroll */}
      {!isLoading && videoFeed.length > 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white/50 text-sm">
          {currentVideoIndex + 1} / {videoFeed.length}
        </div>
      )}
    </div>
  );
};