import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, MessageSquare, Users, Settings, Monitor, Video } from 'lucide-react';
import { WebRTCStream } from '../stream/WebRTCStream';
import { StreamChat } from '../stream/StreamChat';
import { useAppStore } from '../../store/appStore';
import { generateMockData } from '../../lib/utils';
import { Button } from '../ui/Button';

export const StreamDashboard: React.FC = () => {
  const { activeStreams, currentStream, setActiveStreams, setCurrentStream, setActivePage, currentUser } = useAppStore();
  const [chatVisible, setChatVisible] = useState(true);
  const [mode, setMode] = useState<'viewer' | 'streamer'>('viewer');

  useEffect(() => {
    const { mockStreams } = generateMockData();
    setActiveStreams(mockStreams);
    if (mockStreams.length > 0) {
      setCurrentStream(mockStreams[0]);
    }
  }, [setActiveStreams, setCurrentStream]);

  // Determine if current user is the streamer
  useEffect(() => {
    if (currentStream && currentUser) {
      setMode(currentStream.creator.id === currentUser.id ? 'streamer' : 'viewer');
    }
  }, [currentStream, currentUser]);

  const handleStreamStart = (stream: MediaStream) => {
    console.log('Stream started in dashboard:', stream.getTracks());
  };

  const handleStreamEnd = () => {
    console.log('Stream ended in dashboard');
  };

  if (!currentStream) {
    return (
      <div className="h-screen bg-flux-bg-primary flex items-center justify-center">
        <div className="text-center">
          <Video className="w-16 h-16 text-flux-text-secondary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-flux-text-primary mb-4">No Stream Selected</h2>
          <p className="text-flux-text-secondary mb-6">Choose a stream to watch or start your own</p>
          <Button onClick={() => setActivePage('home')}>
            Go Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-flux-bg-primary flex">
      {/* Stream Player */}
      <div className="flex-1 relative">
        <WebRTCStream
          streamId={currentStream.id}
          isStreamer={mode === 'streamer'}
          onStreamStart={handleStreamStart}
          onStreamEnd={handleStreamEnd}
          className="w-full h-full"
        />

        {/* Mobile Chat Toggle */}
        <div className="absolute top-4 right-4 md:hidden z-10">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setChatVisible(!chatVisible)}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>

        {/* Close Button */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setActivePage('home')}
          >
            <X className="w-5 h-5 text-white" />
          </Button>
        </div>

        {/* Stream Info Overlay */}
        <div className="absolute bottom-20 left-4 right-4 md:right-80 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
            <h2 className="text-white font-bold text-lg mb-1">{currentStream.title}</h2>
            <p className="text-white/80 text-sm mb-2">{currentStream.creator.displayName}</p>
            <div className="flex items-center space-x-4 text-white/70 text-sm">
              <div className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{currentStream.viewers.toLocaleString()} viewers</span>
              </div>
              <span>•</span>
              <span>{currentStream.category}</span>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-flux-accent-red rounded-full animate-pulse" />
                <span>LIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mode Toggle (for demo) */}
        <div className="absolute bottom-4 left-4 z-10">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setMode(mode === 'viewer' ? 'streamer' : 'viewer')}
          >
            <Monitor className="w-4 h-4 mr-2" />
            {mode === 'viewer' ? 'Switch to Streamer' : 'Switch to Viewer'}
          </Button>
        </div>
      </div>

      {/* Chat Sidebar - Desktop */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: chatVisible ? 320 : 0 }}
        className="hidden md:block overflow-hidden border-l border-flux-bg-tertiary"
      >
        <StreamChat streamId={currentStream.id} className="w-80 h-full" />
      </motion.div>

      {/* Chat Overlay - Mobile */}
      {chatVisible && (
        <div className="absolute inset-0 bg-black/50 md:hidden z-20">
          <motion.div
            initial={{ translateX: '100%' }}
            animate={{ translateX: 0 }}
            exit={{ translateX: '100%' }}
            className="absolute right-0 top-0 bottom-0 w-4/5 max-w-sm"
          >
            <StreamChat streamId={currentStream.id} className="w-full h-full" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setChatVisible(false)}
              className="absolute top-4 right-4 z-10"
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      )}

      {/* Stream List - Available Streams */}
      <div className="absolute top-20 left-4 space-y-2 max-w-xs z-10">
        {activeStreams.slice(0, 3).map((stream) => (
          <motion.button
            key={stream.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentStream(stream)}
            className={`w-full p-3 rounded-lg bg-flux-bg-secondary/90 backdrop-blur-sm border transition-colors ${
              currentStream.id === stream.id
                ? 'border-flux-primary'
                : 'border-flux-bg-tertiary hover:border-flux-primary/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={stream.thumbnail}
                  alt={stream.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="absolute -top-1 -right-1 bg-flux-accent-red text-white text-xs px-1 rounded font-bold">
                  LIVE
                </div>
              </div>
              <div className="flex-1 text-left">
                <p className="text-flux-text-primary font-medium text-sm truncate">
                  {stream.title}
                </p>
                <p className="text-flux-text-secondary text-xs">
                  {stream.creator.displayName}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Users className="w-3 h-3 text-flux-text-secondary" />
                  <span className="text-flux-text-secondary text-xs">
                    {stream.viewers.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};