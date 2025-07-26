import React from 'react';
import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';
import { formatNumber } from '../../lib/utils';

interface HashtagCardProps {
  hashtag: {
    tag: string;
    posts: number;
    growth: string;
  };
  index: number;
}

export const HashtagCard: React.FC<HashtagCardProps> = ({ hashtag, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
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
  );
};
