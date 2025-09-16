import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Share2, 
  Copy, 
  Eye, 
  Heart, 
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  StopCircle,
  Play,
  Monitor,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useAppStore, LiveStream } from '../../store/appStore';
import { useWallet } from '../../hooks/useWallet';
import { StreamingService } from '../../lib/streamingService';
import toast from 'react-hot-toast';
import { WebRTCStream } from '../stream/WebRTCStream';
import { StreamChat } from '../stream/StreamChat';

interface StreamStats {
  currentViewers: number;
  peakViewers: number;
  totalViews: number;
  chatMessages: number;
  likes: number;
  shares: number;
  streamDuration: string;
  revenue: number;
}

export const StreamManagementDashboard: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const { newAuthActor } = useWallet();
  const { currentUser, activeStreams, setActiveStreams, currentStream, setCurrentStream } = useAppStore();
  
  const [isStreamLive, setIsStreamLive] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  
  const [stats, setStats] = useState<StreamStats>({
    currentViewers: 0,
    peakViewers: 0,
    totalViews: 0,
    chatMessages: 0,
    likes: 0,
    shares: 0,
    streamDuration: '00:00:00',
    revenue: 0
  });

  // Demo canister configuration - memoized to prevent re-renders
  const demoCanisterId = useMemo(() => 'rrkah-fqaaa-aaaaa-aaaaq-cai', []);
  const demoIdlFactory = useMemo(() => ({
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
  }), []);

  // Helper function to calculate stream duration
  const getStreamDuration = useCallback((startTime: Date | string | undefined): string => {
    if (!startTime) return '00:00:00';
    
    const now = new Date();
    const startDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const diff = now.getTime() - startDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Find the current stream
  useEffect(() => {
    if (streamId && activeStreams.length > 0) {
      const stream = activeStreams.find(s => s.id === streamId);
      if (stream) {
        setCurrentStream(stream);
        // Update stats from stream data
        setStats({
          currentViewers: stream.viewers || 0,
          peakViewers: stream.metrics?.peakViewers || 0,
          totalViews: stream.metrics?.totalViews || 0,
          chatMessages: 0,
          likes: 0,
          shares: 0,
          streamDuration: getStreamDuration(stream.startedAt),
          revenue: 0
        });
      }
    }
  }, [streamId, activeStreams, setCurrentStream]);

  // Update stream duration every second - only update if stream is live
  useEffect(() => {
    if (!currentStream?.startedAt || !isStreamLive) return;
    
    const interval = setInterval(() => {
      const newDuration = getStreamDuration(currentStream.startedAt);
      setStats(prev => {
        // Only update if duration actually changed to prevent unnecessary re-renders
        if (prev.streamDuration !== newDuration) {
          return { ...prev, streamDuration: newDuration };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStream?.startedAt, isStreamLive, getStreamDuration]);

  // Simulate viewer count updates - reduced frequency to prevent excessive re-renders
  useEffect(() => {
    if (!isStreamLive) return;
    
    const interval = setInterval(() => {
      setStats(prev => {
        const newViewers = Math.max(0, prev.currentViewers + Math.floor(Math.random() * 10 - 4));
        const newPeak = Math.max(prev.peakViewers, newViewers);
        const viewsIncrement = Math.floor(Math.random() * 3);
        
        // Only update if values actually changed
        if (newViewers !== prev.currentViewers || newPeak !== prev.peakViewers || viewsIncrement > 0) {
          return {
            ...prev,
            currentViewers: newViewers,
            peakViewers: newPeak,
            totalViews: prev.totalViews + viewsIncrement
          };
        }
        return prev;
      });
    }, 5000); // Increased from 3000 to 5000 to reduce frequency

    return () => clearInterval(interval);
  }, [isStreamLive]);

  const handleEndStream = async () => {
    if (!streamId || !newAuthActor) {
      toast.error('Unable to end stream');
      return;
    }

    setIsEnding(true);

    try {
      const streamingService = new StreamingService(newAuthActor);
      const ended = await streamingService.stopStream(streamId);
      
      if (ended) {
        setIsStreamLive(false);
        
        // Update stream status
        if (currentStream) {
          const updatedStream = { ...currentStream, isLive: false };
          setCurrentStream(updatedStream);
          
          // Update active streams
          const updatedStreams = activeStreams.map((s: LiveStream) => 
            s.id === streamId ? updatedStream : s
          );
          setActiveStreams(updatedStreams);
        }

        // Update user status
        if (currentUser) {
          currentUser.isLiveStreaming = false;
        }
        
        toast.success('Stream ended successfully');
        
        // Redirect to home after a short delay
        setTimeout(() => {
          navigate('/home');
        }, 2000);
      } else {
        throw new Error('Failed to end stream on backend');
      }
    } catch (error) {
      console.error('Error ending stream:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('endStream is not a function')) {
          toast.error('Stream ending is not available. Please refresh the page.');
        } else if (error.message.includes('Failed to end stream on backend')) {
          toast.error('Backend failed to end stream. The stream may already be ended.');
        } else {
          toast.error(`Failed to end stream: ${error.message}`);
        }
      } else {
        toast.error('Failed to end stream. Please try again.');
      }
    } finally {
      setIsEnding(false);
    }
  };

  const copyStreamUrl = useCallback(() => {
    if (currentStream?.shareUrl) {
      navigator.clipboard.writeText(currentStream.shareUrl);
      toast.success('Stream URL copied to clipboard!');
    }
  }, [currentStream?.shareUrl]);

  const handleStreamStart = useCallback((stream: MediaStream) => {
    console.log('Stream started in management dashboard:', stream.getTracks());
    setIsConnected(true);
  }, []);

  const handleStreamEnd = useCallback(() => {
    console.log('Stream ended in management dashboard');
    setIsConnected(false);
  }, []);

  // Memoized WebRTC component to prevent unnecessary re-renders
  const MemoizedWebRTCStream = useMemo(() => {
    if (!currentStream) return null;
    
    return (
      <WebRTCStream
        streamId={currentStream.id}
        isStreamer={true}
        mode="streamer"
        canisterId={demoCanisterId}
        idlFactory={demoIdlFactory}
        onStreamStart={handleStreamStart}
        onStreamEnd={handleStreamEnd}
        className="w-full h-full"
      />
    );
  }, [currentStream?.id, demoCanisterId, demoIdlFactory, handleStreamStart, handleStreamEnd]);

  if (!currentStream) {
    return (
      <div className="min-h-screen bg-flux-bg-primary flex items-center justify-center">
        <div className="text-center">
          <Video className="w-16 h-16 text-flux-text-secondary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-flux-text-primary mb-4">Stream Not Found</h2>
          <p className="text-flux-text-secondary mb-6">The stream you're looking for doesn't exist or has ended.</p>
          <Button onClick={() => navigate('/home')}>
            Go Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Check if current user is the stream creator
  const isCreator = currentUser?.id === currentStream.creator.id;
  
  if (!isCreator) {
    // Redirect non-creators to the stream viewer
    navigate(`/stream/${streamId}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-flux-bg-primary">
      {/* Header */}
      <div className="border-b border-flux-bg-tertiary bg-flux-bg-secondary/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/home')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {isStreamLive && (
                    <div className="absolute -top-1 -right-1 bg-flux-accent-red text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                      LIVE
                    </div>
                  )}
                  <Avatar
                    src={currentStream.creator.avatar}
                    alt={currentStream.creator.displayName}
                    size="md"
                    isLive={isStreamLive}
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-flux-text-primary">
                    {currentStream.title}
                  </h1>
                  <p className="text-flux-text-secondary text-sm">
                    Stream Management Dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isConnected 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {isConnected ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>

              {/* Share Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={copyStreamUrl}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>

              {/* End Stream Button */}
              <Button
                variant="danger"
                size="sm"
                onClick={handleEndStream}
                disabled={isEnding || !isStreamLive}
                isLoading={isEnding}
              >
                <StopCircle className="w-4 h-4 mr-2" />
                {isEnding ? 'Ending...' : 'End Stream'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Stream Preview & Controls */}
          <div className="xl:col-span-3 space-y-6">
            {/* Stream Preview */}
            <div className="bg-flux-bg-secondary rounded-xl overflow-hidden">
              <div className="aspect-video relative">
                {MemoizedWebRTCStream}
                
                {/* Stream Controls Overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant={isCameraOn ? "secondary" : "danger"}
                      onClick={() => setIsCameraOn(!isCameraOn)}
                    >
                      {isCameraOn ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <VideoOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant={isMicOn ? "secondary" : "danger"}
                      onClick={() => setIsMicOn(!isMicOn)}
                    >
                      {isMicOn ? (
                        <Mic className="w-4 h-4" />
                      ) : (
                        <MicOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowSettings(!showSettings)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-4 text-white">
                    <div className="flex items-center space-x-2 bg-black/50 px-3 py-1 rounded-full">
                      <Clock className="w-4 h-4" />
                      <span className="font-mono">{stats.streamDuration}</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-black/50 px-3 py-1 rounded-full">
                      <Users className="w-4 h-4" />
                      <span>{stats.currentViewers.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-flux-bg-secondary rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-flux-primary" />
                  <span className="text-flux-text-secondary text-sm">Current Viewers</span>
                </div>
                <p className="text-2xl font-bold text-flux-text-primary">
                  {stats.currentViewers.toLocaleString()}
                </p>
              </div>

              <div className="bg-flux-bg-secondary rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  <span className="text-flux-text-secondary text-sm">Peak Viewers</span>
                </div>
                <p className="text-2xl font-bold text-flux-text-primary">
                  {stats.peakViewers.toLocaleString()}
                </p>
              </div>

              <div className="bg-flux-bg-secondary rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className="w-5 h-5 text-blue-400" />
                  <span className="text-flux-text-secondary text-sm">Total Views</span>
                </div>
                <p className="text-2xl font-bold text-flux-text-primary">
                  {stats.totalViews.toLocaleString()}
                </p>
              </div>

              <div className="bg-flux-bg-secondary rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  <span className="text-flux-text-secondary text-sm">Likes</span>
                </div>
                <p className="text-2xl font-bold text-flux-text-primary">
                  {stats.likes.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Stream Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-flux-bg-secondary rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold text-flux-text-primary mb-4">
                    Stream Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-flux-text-primary mb-2">
                        Stream Quality
                      </label>
                      <select className="w-full px-3 py-2 bg-flux-bg-tertiary text-flux-text-primary rounded-lg">
                        <option>1080p 60fps</option>
                        <option>1080p 30fps</option>
                        <option>720p 60fps</option>
                        <option>720p 30fps</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-flux-text-primary mb-2">
                        Bitrate
                      </label>
                      <select className="w-full px-3 py-2 bg-flux-bg-tertiary text-flux-text-primary rounded-lg">
                        <option>6000 kbps</option>
                        <option>4500 kbps</option>
                        <option>3000 kbps</option>
                        <option>2000 kbps</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chat Sidebar */}
          <div className="xl:col-span-1">
            <div className="bg-flux-bg-secondary rounded-xl overflow-hidden h-[600px]">
              <div className="p-4 border-b border-flux-bg-tertiary">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-flux-text-primary">
                    Stream Chat
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowChat(!showChat)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {showChat && (
                <StreamChat 
                  streamId={currentStream.id} 
                  className="h-[calc(600px-73px)]" 
                />
              )}
            </div>
          </div>
        </div>

        {/* Stream Information */}
        <div className="mt-6 bg-flux-bg-secondary rounded-xl p-6">
          <h3 className="text-lg font-semibold text-flux-text-primary mb-4">
            Stream Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-flux-text-secondary text-sm mb-1">Stream URL</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={currentStream.shareUrl || ''}
                  readOnly
                  className="flex-1 px-3 py-2 bg-flux-bg-tertiary text-flux-text-primary rounded-lg text-sm"
                />
                <Button size="sm" onClick={copyStreamUrl}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-flux-text-secondary text-sm mb-1">Stream Key</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={currentStream.streamKey || ''}
                  readOnly
                  className="flex-1 px-3 py-2 bg-flux-bg-tertiary text-flux-text-primary rounded-lg text-sm font-mono"
                />
                <Button size="sm" onClick={() => {
                  if (currentStream.streamKey) {
                    navigator.clipboard.writeText(currentStream.streamKey);
                    toast.success('Stream key copied!');
                  }
                }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};