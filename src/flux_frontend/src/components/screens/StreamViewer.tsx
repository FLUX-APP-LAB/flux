import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, MessageSquare, Share2, Copy, Video, X } from 'lucide-react';
import { WebRTCStream } from '../stream/WebRTCStream';
import { StreamChat } from '../stream/StreamChat';
import { useAppStore } from '../../store/appStore';
import { StreamingService } from '../../lib/streamingService';
import { useWallet } from '../../hooks/useWallet';
import { Button } from '../ui/Button';
import { toast } from 'react-hot-toast';

export const StreamViewer: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const { activeStreams, currentStream, setCurrentStream, setActiveStreams } = useAppStore();
  const [chatVisible, setChatVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [streamingService, setStreamingService] = useState<StreamingService | null>(null);
  const { newAuthActor } = useWallet();

  // Demo canister configuration
  const demoCanisterId = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
  const demoIdlFactory = {
    createActor: () => ({
      startGameStream: async () => ({ success: true, streamId: 'demo-stream-123' }),
      stopStream: async () => ({ success: true }),
      getActiveStreams: async () => [],
      watchStream: async () => ({ success: true }),
      leaveStream: async () => ({ success: true }),
      createWebRTCStream: async (streamData: any) => ({ ok: streamData }),
      joinStream: async (streamId: string, offer: string) => ({ ok: true }),
      getPendingViewers: async (streamId: string) => ({ ok: [] }),
      sendAnswer: async (answerData: any) => ({ ok: true }),
      sendIceCandidate: async (candidateData: any) => ({ ok: true })
    })
  };

  // Initialize streaming service
  useEffect(() => {
    if (newAuthActor) {
      const service = new StreamingService(newAuthActor);
      setStreamingService(service);
    }
  }, [newAuthActor]);

  // Load stream data
  useEffect(() => {
    const loadStream = async () => {
      if (!streamId) return;

      setIsLoading(true);
      try {
        // First check if this is already the current stream
        if (currentStream && currentStream.id === streamId) {
          console.log('Using current stream:', currentStream);
          setIsLoading(false);
          return;
        }

        // Then check if we have this stream in our active streams cache
        let stream = activeStreams.find(s => s.id === streamId);
        
        if (stream) {
          setCurrentStream(stream);
          console.log('Stream found in cache:', stream);
          setIsLoading(false);
          return;
        }

        // If not found and we have streaming service, load from backend
        if (streamingService) {
          console.log('Stream not found in cache, loading from backend...');
          
          // First try to get all live streams
          const streams = await streamingService.getLiveStreams();
          setActiveStreams(streams);
          stream = streams.find(s => s.id === streamId);
          
          if (stream) {
            setCurrentStream(stream);
            console.log('Stream loaded from live streams:', stream);
          } else {
            // If not found in live streams, try to get the specific stream
            console.log('Stream not in live streams, trying to get specific stream...');
            const specificStream = await streamingService.getStream(streamId);
            
            if (specificStream) {
              setCurrentStream(specificStream);
              console.log('Stream loaded by ID:', specificStream);
              // Also add it to active streams if it's live
              if (specificStream.isLive) {
                setActiveStreams([specificStream, ...streams]);
              }
            } else {
              console.error('Stream not found anywhere:', streamId);
              toast.error('Stream not found or is no longer live');
              navigate('/streams');
              return;
            }
          }
        } else {
          // No streaming service yet, but we might be waiting for auth
          console.log('Waiting for streaming service to initialize...');
          setTimeout(() => loadStream(), 1000); // Retry after 1 second
          return;
        }
      } catch (error) {
        console.error('Error loading stream:', error);
        toast.error('Failed to load stream');
        navigate('/streams');
      } finally {
        setIsLoading(false);
      }
    };

    loadStream();
  }, [streamId, streamingService, activeStreams, currentStream, setActiveStreams, setCurrentStream, navigate]);

  const handleBack = () => {
    navigate('/streams');
  };

  const handleShareStream = async () => {
    if (!currentStream || !streamingService) return;
    
    try {
      // Convert LiveStream to FrontendStream format for sharing
      const frontendStream = {
        id: currentStream.id,
        title: currentStream.title,
        description: '', // LiveStream doesn't have description
        thumbnail: currentStream.thumbnail,
        creator: {
          id: currentStream.creator.id,
          username: currentStream.creator.username,
          displayName: currentStream.creator.displayName,
          avatar: currentStream.creator.avatar,
          isLiveStreaming: currentStream.creator.isLiveStreaming || false,
        },
        viewers: currentStream.viewers,
        isLive: currentStream.isLive,
        category: currentStream.category,
        streamUrl: '', // Not available in LiveStream
        streamKey: '', // Not available in LiveStream
        shareUrl: `${window.location.origin}/stream/${currentStream.id}`,
        startedAt: new Date(),
        metrics: {
          peakViewers: currentStream.viewers,
          averageViewers: currentStream.viewers,
          totalViews: currentStream.viewers,
          engagement: 0,
        }
      };
      
      const success = await streamingService.shareStream(frontendStream);
      if (success) {
        toast.success('Stream URL copied to clipboard!');
      } else {
        toast.error('Failed to share stream');
      }
    } catch (error) {
      console.error('Error sharing stream:', error);
      toast.error('Failed to share stream');
    }
  };

  const handleCopyStreamUrl = async () => {
    if (!currentStream) return;
    
    try {
      const url = `${window.location.origin}/stream/${currentStream.id}`;
      await navigator.clipboard.writeText(url);
      toast.success('Stream URL copied to clipboard!');
    } catch (error) {
      console.error('Error copying stream URL:', error);
      toast.error('Failed to copy stream URL');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-flux-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-flux-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-white mb-2">Loading Stream</h2>
          <p className="text-flux-text-secondary">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!currentStream) {
    return (
      <div className="h-screen bg-flux-bg-primary flex items-center justify-center">
        <div className="text-center">
          <Video className="w-16 h-16 text-flux-text-secondary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-flux-text-primary mb-4">Stream Not Found</h2>
          <p className="text-flux-text-secondary mb-6">
            The stream you're looking for doesn't exist or is no longer live.
          </p>
          <div className="flex space-x-4 justify-center">
            <Button onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Streams
            </Button>
          </div>
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
          isStreamer={false}
          mode="viewer"
          canisterId={demoCanisterId}
          idlFactory={demoIdlFactory}
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

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBack}
            className="bg-black/30 hover:bg-black/50 text-white border-white/20"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
        </div>

        {/* Stream Info Overlay */}
        <div className="absolute bottom-20 left-4 right-4 md:right-80 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h2 className="text-white font-bold text-lg mb-1">{currentStream.title}</h2>
                <div className="flex items-center space-x-3 mb-2">
                  <img
                    src={currentStream.creator.avatar}
                    alt={currentStream.creator.displayName}
                    className="w-8 h-8 rounded-full"
                  />
                  <p className="text-white/80 text-sm">{currentStream.creator.displayName}</p>
                  {currentStream.creator.tier && (
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      currentStream.creator.tier === 'platinum' ? 'bg-purple-500/20 text-purple-400' :
                      currentStream.creator.tier === 'gold' ? 'bg-yellow-500/20 text-yellow-400' :
                      currentStream.creator.tier === 'silver' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {currentStream.creator.tier.toUpperCase()}
                    </div>
                  )}
                </div>
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
              
              {/* Share Buttons */}
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopyStreamUrl}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleShareStream}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Streams */}
        {activeStreams.length > 1 && (
          <div className="absolute top-20 left-4 space-y-2 max-w-xs z-10">
            <h3 className="text-white/60 text-sm font-medium mb-2">Other Live Streams</h3>
            {activeStreams
              .filter(stream => stream.id !== currentStream.id)
              .slice(0, 3)
              .map((stream) => (
                <motion.button
                  key={stream.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/stream/${stream.id}`)}
                  className="w-full p-3 rounded-lg bg-flux-bg-secondary/90 backdrop-blur-sm border border-flux-bg-tertiary hover:border-flux-primary/50 transition-colors"
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
        )}
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
    </div>
  );
};