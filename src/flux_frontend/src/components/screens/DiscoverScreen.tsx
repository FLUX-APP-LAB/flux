import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Hash, Users, Play, RefreshCw } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { UserCard } from '../ui/UserCard';
import { VideoCard } from '../ui/VideoCard';
import { HashtagCard } from '../ui/HashtagCard';
import { useAppStore } from '../../store/appStore';
import { useWallet } from '../../hooks/useWallet';
import { formatNumber } from '../../lib/utils';
import { SearchService, FrontendUser } from '../../lib/searchService';
import { VideoService } from '../../lib/videoService';
import toast from 'react-hot-toast';

export const DiscoverScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'hashtags' | 'creators'>('trending');
  const [trendingVideos, setTrendingVideos] = useState<any[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<any[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<FrontendUser[]>([]);
  const [searchResults, setSearchResults] = useState<{ videos: any[]; users: FrontendUser[]; hashtags: any[] }>({
    videos: [],
    users: [],
    hashtags: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { setActivePage, currentUser } = useAppStore();
  const { newAuthActor, principal } = useWallet();

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!newAuthActor) return;
      
      setIsLoading(true);
      try {
        const searchService = new SearchService(newAuthActor, currentUser?.id);
        const videoService = new VideoService(newAuthActor);
        
        // Load trending videos
        const trending = await videoService.getTrendingVideos();
        setTrendingVideos(trending.slice(0, 6));
        
        // Load suggested creators
        const suggestedUsers = await searchService.getSuggestedUsers(10);
        setSuggestedCreators(suggestedUsers);
        
        // Get hashtags from recent videos
        const allVideos = await videoService.getAllVideos();
        const hashtags = extractHashtagsFromVideos(allVideos);
        setTrendingHashtags(hashtags);
        
      } catch (error) {
        console.error('Error loading discover data:', error);
        toast.error('Failed to load discover content');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [newAuthActor, currentUser]);

  // Search functionality
  useEffect(() => {
    const performSearch = async () => {
      if (!newAuthActor) {
        setSearchResults({ videos: [], users: [], hashtags: [] });
        return;
      }

      setIsSearching(true);
      try {
        const searchService = new SearchService(newAuthActor, currentUser?.id);
        const results = await searchService.searchAll(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Error performing search:', error);
        toast.error('Search failed');
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, newAuthActor, currentUser]);

  const handleFollowUser = async (userId: string) => {
    if (!newAuthActor) return;
    
    // Check if the user is already being followed
    const userToFollow = suggestedCreators.find(user => user.id === userId) || 
                        searchResults.users.find(user => user.id === userId);
    
    if (userToFollow?.isFollowing) {
      toast.info('You are already following this user');
      return;
    }
    
    try {
      const searchService = new SearchService(newAuthActor, currentUser?.id);
      const success = await searchService.followUser(userId);
      
      if (success) {
        // Update the user in the UI
        setSuggestedCreators(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, isFollowing: true, followersCount: user.followersCount + 1 }
              : user
          )
        );
        setSearchResults(prev => ({
          ...prev,
          users: prev.users.map(user => 
            user.id === userId 
              ? { ...user, isFollowing: true, followersCount: user.followersCount + 1 }
              : user
          )
        }));
        
        // Also update the current user's following list
        if (currentUser) {
          useAppStore.setState(state => ({
            ...state,
            currentUser: {
              ...state.currentUser!,
              following: [...(state.currentUser!.following || []), userId]
            }
          }));
        }
        
        toast.success('User followed successfully');
      } else {
        toast.error('Failed to follow user');
      }
    } catch (error) {
      console.error('Error following user:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to follow user';
      
      // Improved error message to catch "Already following" errors
      if (errorMsg.includes('Already following')) {
        toast.info('You are already following this user');
        
        // Update UI to show the user as followed
        setSuggestedCreators(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, isFollowing: true }
              : user
          )
        );
        setSearchResults(prev => ({
          ...prev,
          users: prev.users.map(user => 
            user.id === userId 
              ? { ...user, isFollowing: true }
              : user
          )
        }));
      } else {
        toast.error('Failed to follow user');
      }
    }
  };

  const extractHashtagsFromVideos = (videos: any[]) => {
    const hashtagCounts = new Map<string, number>();
    
    videos.forEach(video => {
      if (video.hashtags && Array.isArray(video.hashtags)) {
        video.hashtags.forEach((tag: string) => {
          const count = hashtagCounts.get(tag) || 0;
          hashtagCounts.set(tag, count + 1);
        });
      }
    });

    return Array.from(hashtagCounts.entries())
      .map(([tag, count]) => ({
        tag: `#${tag}`,
        posts: count,
        growth: `+${Math.floor(Math.random() * 20)}%`
      }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 6);
  };

  const tabs = [
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'hashtags', label: 'Hashtags', icon: Hash },
    { id: 'creators', label: 'Creators', icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-flux-bg-primary pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-flux-bg-primary/95 backdrop-blur-lg border-b border-flux-bg-tertiary z-10">
        <div className="p-4 pt-12">
          <h1 className="text-2xl font-bold text-flux-text-primary mb-4">Discover</h1>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-flux-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos, creators, hashtags..."
              className="w-full pl-10 pr-4 py-3 bg-flux-bg-secondary text-flux-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-flux-primary"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="w-5 h-5 text-flux-text-secondary animate-spin" />
              </div>
            )}
          </div>

          {/* Tabs - only show when not searching */}
          {!searchQuery.trim() && (
            <div className="flex space-x-1 bg-flux-bg-secondary rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-flux-primary text-white'
                      : 'text-flux-text-secondary hover:text-flux-text-primary'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-flux-primary animate-spin" />
          </div>
        ) : searchQuery.trim() || searchResults.users.length > 0 ? (
          /* Search Results */
          <div className="space-y-6">
            {/* Users Results */}
            {searchResults.users.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-flux-text-primary mb-4">
                  {searchQuery.trim() ? `Users (${searchResults.users.length})` : 'All Users'}
                </h2>
                <div className="space-y-3">
                  {searchResults.users.map((user, index) => (
                    <UserCard 
                      key={user.id} 
                      user={user} 
                      index={index} 
                      onFollow={() => handleFollowUser(user.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Videos Results */}
            {searchResults.videos.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-flux-text-primary mb-4">
                  Videos ({searchResults.videos.length})
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {searchResults.videos.slice(0, 6).map((video, index) => (
                    <VideoCard 
                      key={video.id} 
                      video={video} 
                      index={index} 
                      onClick={() => setActivePage('home')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Hashtags Results */}
            {searchResults.hashtags.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-flux-text-primary mb-4">
                  Hashtags ({searchResults.hashtags.length})
                </h2>
                <div className="space-y-3">
                  {searchResults.hashtags.map((hashtag, index) => (
                    <HashtagCard key={hashtag.tag} hashtag={hashtag} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchQuery.trim() && searchResults.users.length === 0 && searchResults.videos.length === 0 && searchResults.hashtags.length === 0 && !isSearching && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-flux-text-secondary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-flux-text-primary mb-2">No results found</h3>
                <p className="text-flux-text-secondary">Try a different search term</p>
              </div>
            )}
          </div>
        ) : activeTab === 'trending' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-flux-text-primary mb-4">
                Trending Videos
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {trendingVideos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative aspect-[9/16] rounded-xl overflow-hidden bg-flux-bg-secondary cursor-pointer"
                    onClick={() => setActivePage('home')}
                  >
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-2 left-2">
                      <div className="bg-flux-accent-red px-2 py-1 rounded text-white text-xs font-bold">
                        #{index + 1}
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-sm font-medium line-clamp-2 mb-1">
                        {video.title}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Play className="w-3 h-3 text-white" />
                        <span className="text-white/80 text-xs">
                          {formatNumber(video.views)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hashtags' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-flux-text-primary">
              Trending Hashtags
            </h2>
            {trendingHashtags.map((hashtag, index) => (
              <motion.div
                key={hashtag.tag}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-flux-bg-secondary rounded-xl"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-flux-gradient rounded-lg flex items-center justify-center">
                    <Hash className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-flux-text-primary font-semibold">
                      {hashtag.tag}
                    </p>
                    <p className="text-flux-text-secondary text-sm">
                      {formatNumber(hashtag.posts)} posts
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-flux-accent-green text-sm font-medium">
                    {hashtag.growth}
                  </p>
                  <p className="text-flux-text-secondary text-xs">growth</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'creators' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-flux-text-primary">
              Suggested Creators
            </h2>
            {suggestedCreators.map((creator, index) => (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-flux-bg-secondary rounded-xl"
              >
                <div className="flex items-center space-x-3">
                  <Avatar
                    src={creator.avatar}
                    alt={creator.displayName}
                    size="lg"
                  />
                  <div>
                    <p className="text-flux-text-primary font-semibold">
                      {creator.displayName}
                    </p>
                    <p className="text-flux-text-secondary text-sm">
                      @{creator.username}
                    </p>
                    <p className="text-flux-text-secondary text-xs">
                      {formatNumber(Math.floor(Math.random() * 1000000))} followers
                    </p>
                  </div>
                </div>
                <Button size="sm">Follow</Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};