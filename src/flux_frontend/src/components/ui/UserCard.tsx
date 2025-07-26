import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { FrontendUser } from '../../lib/searchService';
import { formatNumber } from '../../lib/utils';

interface UserCardProps {
  user: FrontendUser;
  index: number;
  onFollow: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, index, onFollow }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between p-4 bg-flux-bg-secondary rounded-xl"
    >
      <div className="flex items-center space-x-3">
        <Avatar
          src={user.avatar}
          alt={user.displayName}
          size="lg"
        />
        <div>
          <div className="flex items-center">
            <p className="text-flux-text-primary font-semibold mr-1">
              {user.displayName}
            </p>
            {user.isVerified && (
              <span className="bg-flux-primary rounded-full p-0.5">
                <Check className="w-3 h-3 text-white" />
              </span>
            )}
          </div>
          <p className="text-flux-text-secondary text-sm">
            @{user.username}
          </p>
          <p className="text-flux-text-secondary text-xs">
            {formatNumber(user.followersCount)} followers
          </p>
        </div>
      </div>
      <Button 
        size="sm" 
        variant={user.isFollowing ? "secondary" : "primary"}
        onClick={onFollow}
      >
        {user.isFollowing ? 'Following' : 'Follow'}
      </Button>
    </motion.div>
  );
};
