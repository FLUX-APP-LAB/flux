import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Heart, Gift, Settings, Maximize2 } from 'lucide-react';
import { cn, formatNumber } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { LiveStream } from '../../store/appStore';

interface StreamPlayerProps {
  stream: LiveStream;
  mode?: 'viewer' | 'streamer';
  className?: string;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  stream,
  mode = 'viewer',
  className
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);

  return (
    <div className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
      {/* Stream Video */}
      <div className="w-full h-full bg-gradient-to-br from-flux-primary to-flux-accent-purple flex items-center justify-center">
        <img
          src={stream.thumbnail}
          alt={stream.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Stream Overlays */}
      {showOverlays && (
        <>
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-flux-accent-red px-2 py-1 rounded text-white text-xs font-bold">
                  LIVE
                </div>
                <div className="flex items-center space-x-2 text-white">
                  <Users className="w-4 h-4" />
                  <span>{formatNumber(stream.viewers)}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {mode === 'streamer' && (
                  <Button size="sm" variant="ghost">
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setIsFullscreen(!isFullscreen)}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Stream Info */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar
                  src={stream.creator.avatar}
                  alt={stream.creator.displayName}
                  size="lg"
                  isLive={true}
                />
                <div>
                  <h3 className="text-white font-bold text-lg">{stream.title}</h3>
                  <p className="text-white/80">{stream.creator.displayName}</p>
                  <p className="text-white/60 text-sm">{stream.category}</p>
                </div>
              </div>

              {mode === 'viewer' && (
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="secondary">
                    <Heart className="w-4 h-4 mr-1" />
                    Follow
                  </Button>
                  <Button size="sm" variant="primary">
                    <Gift className="w-4 h-4 mr-1" />
                    Gift
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Gifts Overlay */}
          <div className="absolute top-20 right-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-flux-gradient-gold rounded-lg px-3 py-2 text-white text-sm font-medium"
              >
                🎁 Gift from @user{i + 1}
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};