import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Hash, Users, Play } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/appStore';
import { generateMockData, formatNumber } from '../../lib/utils';
import { VideoService } from '../../lib/videoService';
import { SearchService, UserSearchResult, TopUser, PlatformStats } from '../../lib/searchService';
import { AnalyticsService } from '../../lib/analyticsService';
import { useWallet } from '../../hooks/useWallet';

export const DiscoverScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'hashtags' | 'creators'>('trending');
  const [trendingVideos, setTrendingVideos] = useState<any[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<any[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setActivePage } = useAppStore();
  const { newAuthActor } = useWallet();

  const [searchResults, setSearchResults] = useState<UserSearchResult>({
    users: [],
    totalMatches: 0,
    hasMore: false
  });
  const [searchPage, setSearchPage] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    const loadDiscoverData = async () => {
      setIsLoading(true);
      try {
        if (newAuthActor) {
          console.log('Loading discover data from backend...');
          const videoService = new VideoService(newAuthActor);
          const searchService = new SearchService(newAuthActor);
          const analyticsService = new AnalyticsService(newAuthActor);
          
          // Load trending videos
          const trending = await videoService.getTrendingVideos();
          setTrendingVideos(trending.slice(0, 6));
          
          // Load top users by followers
          const topUsersByFollowers = await searchService.getTopUsers('followers', 8);
          setTopUsers(topUsersByFollowers);
          
          // Load platform statistics
          const stats = await searchService.getPlatformStats();
          setPlatformStats(stats);
          
          // Load top performing content for hashtags
          const topContent = await analyticsService.getTopPerformingContent();
          if (topContent.length > 0) {
            // Create hashtags from top content (simplified)
            const hashtags = [
              { tag: '#viral', posts: stats?.totalUsers || 2400000, growth: '+12%' },
              { tag: '#fyp', posts: stats?.activeUsers || 1800000, growth: '+8%' },
              { tag: '#trending', posts: stats?.totalSubscriptions || 1200000, growth: '+15%' },
              { tag: '#comedy', posts: 980000, growth: '+5%' },
              { tag: '#music', posts: 760000, growth: '+18%' },
              { tag: '#dance', posts: 650000, growth: '+3%' }
            ];
            setTrendingHashtags(hashtags);
          }
          
          console.log(`Loaded ${trending.length} trending videos and ${topUsersByFollowers.length} top users for discover`);
        } else {
          console.log('No actor available, using mock data for discover...');
          const { mockVideos, mockUsers } = generateMockData();
          setTrendingVideos(mockVideos.slice(0, 6));
          setSuggestedCreators(mockUsers);
          setTrendingHashtags([
            { tag: '#viral', posts: 2400000, growth: '+12%' },
            { tag: '#fyp', posts: 1800000, growth: '+8%' },
            { tag: '#trending', posts: 1200000, growth: '+15%' },
            { tag: '#comedy', posts: 980000, growth: '+5%' },
            { tag: '#music', posts: 760000, growth: '+18%' },
            { tag: '#dance', posts: 650000, growth: '+3%' }
          ]);
        }
      } catch (error) {
        console.error('Error loading discover data:', error);
        const { mockVideos, mockUsers } = generateMockData();
        setTrendingVideos(mockVideos.slice(0, 6));
        setSuggestedCreators(mockUsers);
        setTrendingHashtags([
          { tag: '#viral', posts: 2400000, growth: '+12%' },
          { tag: '#fyp', posts: 1800000, growth: '+8%' },
          { tag: '#trending', posts: 1200000, growth: '+15%' },
          { tag: '#comedy', posts: 980000, growth: '+5%' },
          { tag: '#music', posts: 760000, growth: '+18%' },
          { tag: '#dance', posts: 650000, growth: '+3%' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDiscoverData();
  }, [newAuthActor]);

  // Search functionality with pagination
  const performSearch = async (query: string, page: number = 0) => {
    if (!query.trim()) {
      setSearchResults({ users: [], totalMatches: 0, hasMore: false });
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const searchService = new SearchService(newAuthActor!);
      const result = await searchService.searchUsers(query, page, 10);
      
      if (page === 0) {
        setSearchResults(result);
      } else {
        setSearchResults(prev => ({
          ...result,
          users: [...prev.users, ...result.users]
        }));
      }
      
      setShowSearchResults(true);
      console.log(`Found ${result.users.length} users for query: ${query}`);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ users: [], totalMatches: 0, hasMore: false });
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger search when query changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery, 0);
      } else {
        setSearchResults({ users: [], totalMatches: 0, hasMore: false });
        setShowSearchResults(false);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, newAuthActor]);

  const tabs = [
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'hashtags', label: 'Hashtags', icon: Hash },
    { id: 'creators', label: 'Creators', icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-flux-bg-primary pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-flux-bg-primary/95 backdrop-blur-lg border-b border-flux-bg-tertiary z-10">
        <div className="p-3 md:p-4 pt-8 md:pt-12">
          <h1 className="text-xl md:text-2xl font-bold text-flux-text-primary mb-3 md:mb-4">Discover</h1>
          
          {/* Search Bar */}
          <div className="relative mb-3 md:mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-flux-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos, creators, hashtags..."
              className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 bg-flux-bg-secondary text-flux-text-primary text-sm md:text-base rounded-xl focus:outline-none focus:ring-2 focus:ring-flux-primary"
            />
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-flux-bg-secondary rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-1 md:space-x-2 py-2 px-2 md:px-3 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-flux-primary text-white'
                    : 'text-flux-text-secondary hover:text-flux-text-primary'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-xs md:text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        {/* Search Results */}
        {searchQuery.trim() && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-flux-text-primary">
                Search Results for "{searchQuery}"
              </h2>
              {isSearching && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-flux-primary"></div>
              )}
            </div>
            
            {isSearching ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flux-primary mx-auto mb-2"></div>
                <p className="text-flux-text-secondary">Searching...</p>
              </div>
            ) : searchResults.users.length > 0 ? (
              <div className="space-y-3">
                {searchResults.users.map((user, index) => (
                  <motion.div
                    key={user.username}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-3 p-3 bg-flux-bg-secondary rounded-xl cursor-pointer hover:bg-flux-bg-tertiary transition-colors"
                    onClick={() => setActivePage('profile')}
                  >
                    <Avatar 
                      src={user.avatar} 
                      alt={user.username}
                      size="md"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-flux-text-primary">{user.displayName}</h3>
                        {user.isVerified && (
                          <div className="w-4 h-4 bg-flux-primary rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-flux-text-secondary text-sm">@{user.username}</p>
                      <p className="text-flux-text-secondary text-xs">
                        {formatNumber(user.followersCount)} followers
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle follow logic
                      }}
                    >
                      Follow
                    </Button>
                  </motion.div>
                ))}
                
                {searchResults.hasMore && (
                  <div className="text-center pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearchPage(prev => prev + 1);
                        performSearch(searchQuery, searchPage + 1);
                      }}
                      disabled={isSearching}
                    >
                      {isSearching ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-flux-text-secondary">No users found for "{searchQuery}"</p>
                <p className="text-flux-text-secondary text-sm mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}

        {/* Show tabs content only when not searching */}
        {!searchQuery.trim() && (
          <>
            {activeTab === 'trending' && (
              <div className="space-y-6">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flux-primary mx-auto mb-2"></div>
                    <p className="text-flux-text-secondary">Loading trending videos...</p>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-lg font-semibold text-flux-text-primary mb-4">
                      Trending Videos
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
                )}
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
          <div className="space-y-6">
            {/* Platform Statistics */}
            {platformStats && (
              <div className="bg-flux-bg-secondary rounded-xl p-4">
                <h2 className="text-lg font-semibold text-flux-text-primary mb-4">
                  Platform Statistics
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-flux-primary">
                      {formatNumber(platformStats.totalUsers)}
                    </p>
                    <p className="text-flux-text-secondary text-sm">Total Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-flux-primary">
                      {formatNumber(platformStats.totalSubscriptions)}
                    </p>
                    <p className="text-flux-text-secondary text-sm">Total Subscriptions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-flux-primary">
                      {formatNumber(platformStats.totalRevenue)}
                    </p>
                    <p className="text-flux-text-secondary text-sm">Total Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-flux-primary">
                      {formatNumber(platformStats.activeUsers)}
                    </p>
                    <p className="text-flux-text-secondary text-sm">Active Users</p>
                  </div>
                </div>
              </div>
            )}

            {/* Top Users by Followers */}
            <div>
              <h2 className="text-lg font-semibold text-flux-text-primary mb-4">
                Top Creators by Followers
              </h2>
              <div className="space-y-3">
                {topUsers.map((user, index) => (
                  <motion.div
                    key={user.username}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-flux-bg-secondary rounded-xl"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-flux-gradient rounded-full flex items-center justify-center text-white font-bold text-sm">
                        #{index + 1}
                      </div>
                      <Avatar
                        src="/default-avatar.png"
                        alt={user.displayName}
                        size="lg"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-flux-text-primary font-semibold">
                            {user.displayName}
                          </p>
                          <div className="w-4 h-4 bg-flux-primary rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-flux-text-secondary text-sm">@{user.username}</p>
                        <p className="text-flux-text-secondary text-xs">
                          {formatNumber(user.value)} {user.tier}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        // Handle follow logic
                        console.log(`Following ${user.username}`);
                      }}
                    >
                      Follow
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Legacy Suggested Creators (fallback) */}
            {suggestedCreators.length > 0 && topUsers.length === 0 && (
              <div>
                <h2 className="text-lg font-semibold text-flux-text-primary mb-4">
                  Suggested Creators
                </h2>
                <div className="space-y-3">
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
                            {formatNumber(creator.followers)} followers
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          // Handle follow logic
                        }}
                      >
                        Follow
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};