import React from 'react';
import { motion } from 'framer-motion';
import { Play, TrendingUp } from 'lucide-react';
import { formatNumber } from '../../lib/utils';

interface VideoCardProps {
  video: any;
  index: number;
  onClick?: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, index, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative aspect-[9/16] rounded-xl overflow-hidden bg-flux-bg-secondary cursor-pointer"
      onClick={onClick}
    >
      <img
        src={video.thumbnail || '/17517500282326374985607665398759.jpg'}
        alt={video.title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute top-2 left-2">
        <div className="bg-flux-primary px-2 py-1 rounded text-white text-xs font-bold">
          #{index + 1}
        </div>
      </div>
      <div className="absolute top-2 right-2">
        <div className="bg-flux-accent-red px-2 py-1 rounded flex items-center space-x-1">
          <TrendingUp className="w-3 h-3 text-white" />
          <span className="text-white text-xs font-medium">Trending</span>
        </div>
      </div>
      <div className="absolute bottom-2 left-2 right-2">
        <p className="text-white text-sm font-medium line-clamp-2 mb-1">
          {video.title}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Play className="w-3 h-3 text-white" />
            <span className="text-white/80 text-xs">
              {formatNumber(video.views || 0)}
            </span>
          </div>
          <span className="text-white/80 text-xs">
            {video.creator?.displayName || 'Unknown'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
