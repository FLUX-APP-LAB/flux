import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User, RefreshCw } from 'lucide-react';
import { VideoPlayer } from '../video/VideoPlayer';
import { useAppStore } from '../../store/appStore';
import { VideoService } from '../../lib/videoService';
import { useWallet } from '../../hooks/useWallet';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';

export const HomeFeed: React.FC = () => {
  const { videoFeed, currentVideoIndex, setVideoFeed, setCurrentVideoIndex, currentUser, setActivePage, activePage } = useAppStore();
  const [feedType, setFeedType] = useState<'foryou' | 'following' | 'trending'>('foryou');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [noFollowingVideos, setNoFollowingVideos] = useState(false);
  const { newAuthActor } = useWallet();
  
  // Development mode check
  const isDevelopment = import.meta.env.DEV;

  // Load videos from backend
  useEffect(() => {
    const loadVideos = async () => {
      if (!newAuthActor) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const videoService = new VideoService(newAuthActor);
        
        let videos;
        switch (feedType) {
          case 'trending':
            videos = await videoService.getTrendingVideos();
            break;
          case 'following':
            if (currentUser?.id) {
              // Get all videos
              const allVideos = await videoService.getAllVideos();
              
              // Filter videos to only show those from users the current user follows
              videos = allVideos.filter(video => {
                // Check if the video creator is in the current user's following list
                return currentUser.following && 
                       Array.isArray(currentUser.following) && 
                       currentUser.following.includes(video.creator.id);
              });
              
              if (videos.length === 0) {
                // If no videos from followed users, show a message and fallback to all videos
                console.log('No videos from followed users found, showing all videos');
                setNoFollowingVideos(true);
                videos = allVideos;
              } else {
                setNoFollowingVideos(false);
              }
            } else {
              // If not logged in or no current user, show all videos
              videos = await videoService.getAllVideos();
            }
            break;
          default:
            videos = await videoService.getAllVideos();
        }
        
        setVideoFeed(videos);
        console.log(`Loaded ${videos.length} videos from backend`);
      } catch (error) {
        console.error('Failed to load videos:', error);
        setVideoFeed([]); // Set empty array if loading fails
      } finally {
        setIsLoading(false);
      }
    };

    loadVideos();
  }, [newAuthActor, feedType, setVideoFeed]);

  // Auto-refresh videos every 30 seconds to show new uploads from other users
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (newAuthActor && !isLoading) {
        console.log('Auto-refreshing video feed...');
        setIsRefreshing(true);
        const videoService = new VideoService(newAuthActor);
        
        try {
          let videos;
          switch (feedType) {
            case 'trending':
              videos = await videoService.getTrendingVideos();
              break;
            case 'following':
              if (currentUser?.id) {
                // Get all videos
                const allVideos = await videoService.getAllVideos();
                
                // Filter videos to only show those from users the current user follows
                videos = allVideos.filter(video => {
                  // Check if the video creator is in the current user's following list
                  return currentUser.following && 
                         Array.isArray(currentUser.following) && 
                         currentUser.following.includes(video.creator.id);
                });
                
                if (videos.length === 0) {
                  // If no videos from followed users, fallback to all videos
                  setNoFollowingVideos(true);
                  videos = allVideos;
                } else {
                  setNoFollowingVideos(false);
                }
              } else {
                // If not logged in or no current user, show all videos
                videos = await videoService.getAllVideos();
              }
              break;
            default:
              videos = await videoService.getAllVideos();
          }
          
          // Always update the feed, even if count is same (videos might have changed status)
          console.log(`Feed refresh: loaded ${videos.length} videos`);
          setVideoFeed(videos);
          setLastRefresh(Date.now());
        } catch (error) {
          console.error('Failed to refresh videos:', error);
        } finally {
          setIsRefreshing(false);
        }
      }
    }, 10000); // Refresh every 10 seconds for better testing experience

    return () => clearInterval(refreshInterval);
  }, [newAuthActor, feedType, videoFeed.length, isLoading, setVideoFeed]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (!newAuthActor || isLoading || isRefreshing) return;
    
    setIsRefreshing(true);
    const videoService = new VideoService(newAuthActor);
    
    try {
      let videos;
      switch (feedType) {
        case 'trending':
          videos = await videoService.getTrendingVideos();
          break;
        case 'following':
          videos = await videoService.getAllVideos();
          break;
        default:
          videos = await videoService.getAllVideos();
      }
      
      setVideoFeed(videos);
      setLastRefresh(Date.now());
      console.log(`Manually refreshed: ${videos.length} videos loaded`);
    } catch (error) {
      console.error('Failed to refresh videos:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

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
            <Button size="sm" variant="ghost" onClick={handleManualRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
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

      {/* Following notification banner */}
      {feedType === 'following' && noFollowingVideos && videoFeed.length > 0 && (
        <div className="absolute top-24 left-0 right-0 z-10 bg-flux-bg-secondary bg-opacity-90 backdrop-blur-sm">
          <div className="p-3 text-center">
            <p className="text-flux-text-primary text-sm">
              No videos from followed creators. Showing popular content instead.
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="text-flux-primary text-xs mt-1"
              onClick={() => setActivePage('discover')}
            >
              Discover creators to follow
            </Button>
          </div>
        </div>
      )}

      {/* Video Feed */}
      <div
        className="h-full snap-y snap-mandatory overflow-y-scroll"
        onScroll={handleScroll}
      >
        {isLoading ? (
          /* Loading State */
          <div className="h-screen flex items-center justify-center bg-flux-bg-primary">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flux-primary mx-auto mb-4"></div>
              <p className="text-flux-text-secondary">Loading videos...</p>
            </div>
          </div>
        ) : videoFeed.length === 0 ? (
          /* Empty State */
          <div className="h-screen flex items-center justify-center bg-flux-bg-primary">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-flux-text-primary mb-2">No videos yet</h3>
              <p className="text-flux-text-secondary mb-4">
                {feedType === 'following' ? 'Follow some creators to see their videos here' : 'Be the first to upload a video!'}
              </p>
              <Button onClick={() => setActivePage('profile')} variant="secondary">
                {feedType === 'following' ? 'Discover Creators' : 'Upload Video'}
              </Button>
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Loading indicator for video position */}
      {!isLoading && videoFeed.length > 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white/50 text-sm">
          {currentVideoIndex + 1} / {videoFeed.length}
        </div>
      )}

      {/* Debug info for development */}
      {import.meta.env.VITE_APP_ENV === 'development' && (
        <div className="absolute top-16 right-4 bg-black/70 text-white p-2 rounded text-xs">
          <div>Videos: {videoFeed.length}</div>
          <div>Feed: {feedType}</div>
          <div>Last refresh: {new Date(lastRefresh).toLocaleTimeString()}</div>
          {isRefreshing && <div className="text-yellow-400">Refreshing...</div>}
        </div>
      )}
    </div>
  );
};