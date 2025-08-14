import React, { useState, useEffect } from 'react';
import { TrendingUp, Flame, Calendar, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { VideoService } from '../../lib/videoService';
import { useWallet } from '../../hooks/useWallet';
import { formatNumber } from '../../lib/utils';

export const TrendingScreen: React.FC = () => {
  const [trendingVideos, setTrendingVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { newAuthActor } = useWallet();

  useEffect(() => {
    const loadTrendingData = async () => {
      setIsLoading(true);
      try {
        if (newAuthActor) {
          console.log('Loading trending data from backend...');
          const videoService = new VideoService(newAuthActor);
          const trending = await videoService.getTrendingVideos();
          setTrendingVideos(trending.slice(0, 10)); // Show top 10
          console.log(`Loaded ${trending.length} trending videos`);
        }
      } catch (error) {
        console.error('Error loading trending data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrendingData();
  }, [newAuthActor]);

  return (
    <div className="min-h-screen bg-flux-bg-primary pt-20 md:pt-20 lg:pt-6 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-flux-primary rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-flux-text-primary">Trending</h1>
              <p className="text-flux-text-secondary">Discover what's hot on FLUX</p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trending Videos */}
          <div className="bg-flux-bg-secondary rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Flame className="w-5 h-5 text-flux-accent-red" />
              <h2 className="text-lg font-semibold text-flux-text-primary">Hot Videos</h2>
            </div>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-flux-accent-red mx-auto mb-2"></div>
                  <p className="text-flux-text-secondary text-sm">Loading trending videos...</p>
                </div>
              ) : trendingVideos.length > 0 ? (
                trendingVideos.slice(0, 3).map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-3 p-3 bg-flux-bg-tertiary rounded-lg"
                  >
                    <div 
                      className="w-16 h-12 bg-flux-bg-primary rounded-lg bg-cover bg-center"
                      style={{ backgroundImage: `url(${video.thumbnail})` }}
                    ></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-flux-text-primary line-clamp-1">{video.title}</p>
                      <p className="text-xs text-flux-text-secondary">
                        {formatNumber(video.views)} views • @{video.creator.username}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-flux-text-secondary text-sm">No trending videos available</p>
                </div>
              )}
            </div>
          </div>

          {/* Trending Creators */}
          <div className="bg-flux-bg-secondary rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Award className="w-5 h-5 text-flux-accent-green" />
              <h2 className="text-lg font-semibold text-flux-text-primary">Rising Creators</h2>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-3 bg-flux-bg-tertiary rounded-lg">
                  <div className="w-10 h-10 bg-flux-primary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-flux-text-primary">Creator #{i}</p>
                    <p className="text-xs text-flux-text-secondary">+50K followers this week</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coming Soon Message */}
        <div className="mt-8 bg-flux-bg-secondary rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-flux-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-flux-text-primary mb-2">More Trending Features Coming Soon</h3>
          <p className="text-flux-text-secondary">We're working on advanced trending analytics and personalized recommendations.</p>
        </div>
      </div>
    </div>
  );
};

export default TrendingScreen;
