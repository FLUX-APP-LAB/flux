import React, { useEffect, useState } from 'react';
import { Play, Users, Eye, Calendar, Clock } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useWallet } from '../../hooks/useWallet';
import { StreamingService } from '../../lib/streamingService';
import toast from 'react-hot-toast';

interface LiveStream {
  id: string;
  title: string;
  streamer: {
    id: string;
    username: string;
    avatar: string;
  };
  thumbnail: string;
  viewerCount: number;
  category: string;
  startTime: string;
  isLive: boolean;
  tags: string[];
}

export const LiveStreamList: React.FC = () => {
  const { currentUser } = useAppStore();
  const { newAuthActor } = useWallet();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'following' | 'category'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Mock data for development
  const mockStreams: LiveStream[] = [
    {
      id: '1',
      title: 'Epic Gaming Session - Come Join!',
      streamer: {
        id: 'user1',
        username: 'ProGamer123',
        avatar: '/default-avatar.png'
      },
      thumbnail: '/demo1.png',
      viewerCount: 1250,
      category: 'Gaming',
      startTime: new Date().toISOString(),
      isLive: true,
      tags: ['fps', 'competitive', 'multiplayer']
    },
    {
      id: '2',
      title: 'Cooking Show Live!',
      streamer: {
        id: 'user2',
        username: 'ChefMaster',
        avatar: '/default-avatar.png'
      },
      thumbnail: '/demo2.png',
      viewerCount: 850,
      category: 'Food',
      startTime: new Date().toISOString(),
      isLive: true,
      tags: ['cooking', 'recipe', 'live']
    },
    {
      id: '3',
      title: 'Music Production Tutorial',
      streamer: {
        id: 'user3',
        username: 'BeatMaker',
        avatar: '/default-avatar.png'
      },
      thumbnail: '/demo3.png',
      viewerCount: 420,
      category: 'Music',
      startTime: new Date().toISOString(),
      isLive: true,
      tags: ['music', 'tutorial', 'production']
    }
  ];

  useEffect(() => {
    // Fetch live streams from backend
    const loadStreams = async () => {
      setLoading(true);
      
      if (!newAuthActor) {
        console.log('No authenticated actor available, using mock data');
        // Use mock data when not authenticated
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay to simulate loading
        setStreams(mockStreams);
        setLoading(false);
        return;
      }

      try {
        const streamingService = new StreamingService(newAuthActor);
        
        // Fetch all live streams (no category filter, limit of 50)
        const fetchedStreams = await streamingService.getLiveStreams(undefined, undefined, 50);
        
        // Console log the fetched streams
        console.log('Fetched live streams from backend:', fetchedStreams);
        
        // Transform to match our interface
        const transformedStreams: LiveStream[] = fetchedStreams.map(stream => ({
          id: stream.id,
          title: stream.title,
          streamer: {
            id: stream.creator.id,
            username: stream.creator.username,
            avatar: stream.creator.avatar || '/default-avatar.png'
          },
          thumbnail: stream.thumbnail || '/demo1.png',
          viewerCount: stream.viewers || 0,
          category: stream.category || 'General',
          startTime: stream.startedAt || new Date().toISOString(),
          isLive: stream.isLive,
          tags: stream.tags || []
        }));
        
        console.log('Transformed streams for frontend:', transformedStreams);
        setStreams(transformedStreams);
        
      } catch (error) {
        console.error('Error fetching live streams:', error);
        toast.error('Failed to load live streams');
        
        // Fallback to mock data in case of error
        setStreams(mockStreams);
      } finally {
        setLoading(false);
      }
    };

    loadStreams();
  }, [newAuthActor]);

  // Function to fetch streams with category filter
  const fetchStreamsByCategory = async (category?: string) => {
    if (!newAuthActor) {
      console.log('No authenticated actor available for category filtering, using mock data');
      return;
    }

    setLoading(true);
    try {
      const streamingService = new StreamingService(newAuthActor);
      
      // Fetch streams with category filter
      const fetchedStreams = await streamingService.getLiveStreams(category, undefined, 50);
      
      console.log(`Fetched live streams for category "${category || 'all'}":`, fetchedStreams);
      
      // Transform to match our interface
      const transformedStreams: LiveStream[] = fetchedStreams.map(stream => ({
        id: stream.id,
        title: stream.title,
        streamer: {
          id: stream.creator.id,
          username: stream.creator.username,
          avatar: stream.creator.avatar || '/default-avatar.png'
        },
        thumbnail: stream.thumbnail || '/demo1.png',
        viewerCount: stream.viewers || 0,
        category: stream.category || 'General',
        startTime: stream.startedAt || new Date().toISOString(),
        isLive: stream.isLive,
        tags: stream.tags || []
      }));
      
      setStreams(transformedStreams);
      
    } catch (error) {
      console.error('Error fetching streams by category:', error);
      toast.error('Failed to filter streams by category');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch streams when category filter changes
  useEffect(() => {
    if (filter === 'category' && selectedCategory && newAuthActor) {
      fetchStreamsByCategory(selectedCategory);
    } else if (filter === 'all' && newAuthActor) {
      fetchStreamsByCategory(); // Fetch all streams
    }
  }, [filter, selectedCategory, newAuthActor]);

  const filteredStreams = streams.filter(stream => {
    if (filter === 'following') {
      // In a real app, check if user follows the streamer
      return true;
    }
    if (filter === 'category' && selectedCategory) {
      return stream.category === selectedCategory;
    }
    return true;
  });

  const categories = ['Gaming', 'Music', 'Food', 'Art', 'Tech', 'Sports'];

  const formatViewerCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flux-accent"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-flux-border">
        <h1 className="text-2xl font-bold text-flux-text-primary mb-4">Live Streams</h1>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-flux-accent text-white'
                  : 'bg-flux-bg-secondary text-flux-text-secondary hover:bg-flux-bg-tertiary'
              }`}
            >
              All Streams
            </button>
            <button
              onClick={() => setFilter('following')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'following'
                  ? 'bg-flux-accent text-white'
                  : 'bg-flux-bg-secondary text-flux-text-secondary hover:bg-flux-bg-tertiary'
              }`}
            >
              Following
            </button>
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setFilter(e.target.value ? 'category' : 'all');
            }}
            className="px-4 py-2 rounded-lg bg-flux-bg-secondary text-flux-text-primary border border-flux-border focus:outline-none focus:ring-2 focus:ring-flux-accent"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Streams Grid */}
      <div className="p-6">
        {filteredStreams.length === 0 ? (
          <div className="text-center py-12">
            <Play className="h-16 w-16 text-flux-text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-flux-text-primary mb-2">
              No streams found
            </h3>
            <p className="text-flux-text-secondary">
              Try adjusting your filters or check back later for new streams.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStreams.map((stream) => (
              <div
                key={stream.id}
                className="bg-flux-bg-secondary rounded-lg overflow-hidden hover:bg-flux-bg-tertiary transition-colors cursor-pointer group"
                onClick={() => window.location.href = `/stream/${stream.id}`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video">
                  <img
                    src={stream.thumbnail}
                    alt={stream.title}
                    className="w-full h-full object-cover"
                  />
                  {stream.isLive && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      LIVE
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                    {formatDuration(stream.startTime)}
                  </div>
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Stream Info */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={stream.streamer.avatar}
                      alt={stream.streamer.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-flux-text-primary truncate group-hover:text-flux-accent transition-colors">
                        {stream.title}
                      </h3>
                      <p className="text-sm text-flux-text-secondary">
                        {stream.streamer.username}
                      </p>
                      <p className="text-sm text-flux-text-tertiary">
                        {stream.category}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between mt-3 text-sm text-flux-text-secondary">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {formatViewerCount(stream.viewerCount)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(stream.startTime)}
                    </div>
                  </div>

                  {/* Tags */}
                  {stream.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {stream.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-flux-bg-tertiary text-flux-text-secondary rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};