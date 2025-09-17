import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Heart, Gift, Settings, Maximize2, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn, formatNumber } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { LiveStream } from '../../store/appStore';
import { WebRTCStreamingService } from '../../lib/webrtcStreamingService';
// Remove this import since we'll pass the actor through props
// import { useAuth } from '../../contexts/AuthContext';

interface StreamPlayerProps {
  stream: LiveStream;
  mode?: 'viewer' | 'streamer';
  className?: string;
  webrtcService: WebRTCStreamingService; // Make this required
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  stream,
  mode = 'viewer',
  className,
  webrtcService,
  onConnectionStatusChange
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(stream.viewers);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!webrtcService) return;

    // Set up event handlers
    webrtcService.setEventHandlers({
      onStreamReceived: (mediaStream: MediaStream) => {
        console.log('Stream received in component:', mediaStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = mediaStream;
          setIsConnected(true);
          setIsConnecting(false);
          setConnectionError(null);
          onConnectionStatusChange?.('connected');
        }
      },
      onStreamEnded: () => {
        console.log('Stream ended in component');
        setIsConnected(false);
        setIsConnecting(false);
        onConnectionStatusChange?.('disconnected');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      },
      onViewerCountChanged: (count: number) => {
        console.log('Viewer count changed:', count);
        setViewerCount(count);
      }
    });

    // Auto-connect for viewers - only if not already connected/connecting
    if (mode === 'viewer' && stream.isLive && !isConnected && !isConnecting && !webrtcService.isConnectedToStream(stream.id) && !webrtcService.isCurrentlyConnecting()) {
      handleJoinStream();
    }

    return () => {
      webrtcService.disconnect();
    };
  }, [webrtcService, mode, stream.isLive]); // Remove isConnected and isConnecting from dependencies to prevent loops

  const handleJoinStream = async () => {
    if (!webrtcService) {
      setConnectionError('WebRTC service not available');
      onConnectionStatusChange?.('error');
      return;
    }

    // Prevent duplicate join attempts
    if (isConnecting || isConnected || webrtcService.isCurrentlyConnecting() || webrtcService.isConnectedToStream(stream.id)) {
      console.log('Already connecting or connected to stream');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    onConnectionStatusChange?.('connecting');

    try {
      const success = await webrtcService.joinStream(stream.id);
      if (!success) {
        setConnectionError('Failed to join stream');
        setIsConnecting(false);
        onConnectionStatusChange?.('error');
      }
    } catch (error) {
      console.error('Error joining stream:', error);
      setConnectionError('Connection error occurred');
      setIsConnecting(false);
      onConnectionStatusChange?.('error');
    }
  };

  const handleStartStreaming = async () => {
    if (!webrtcService) {
      setConnectionError('WebRTC service not available');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const streamId = await webrtcService.startStreaming(
        stream.title,
        stream.description || '',
        stream.category
      );

      if (streamId) {
        const localStream = webrtcService.getLocalStream();
        if (localStream && localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        setIsConnected(true);
        setIsConnecting(false);
      } else {
        setConnectionError('Failed to start streaming');
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      setConnectionError('Failed to start streaming');
      setIsConnecting(false);
    }
  };

  const handleEndStreaming = async () => {
    if (!webrtcService) return;

    try {
      await webrtcService.endStream();
      setIsConnected(false);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    } catch (error) {
      console.error('Error ending stream:', error);
    }
  };

  const handleFullscreen = () => {
    const videoElement = mode === 'streamer' ? localVideoRef.current : remoteVideoRef.current;
    if (!videoElement) return;

    if (!isFullscreen) {
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleMute = () => {
    const videoElement = mode === 'streamer' ? localVideoRef.current : remoteVideoRef.current;
    if (videoElement) {
      videoElement.muted = !videoElement.muted;
      setIsMuted(videoElement.muted);
    }
  };

  const handlePlayPause = () => {
    const videoElement = mode === 'streamer' ? localVideoRef.current : remoteVideoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const renderConnectionStatus = () => {
    if (isConnecting) {
      return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-flux-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Connecting to stream...</p>
          </div>
        </div>
      );
    }

    if (connectionError) {
      return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">{connectionError}</p>
            <Button onClick={mode === 'viewer' ? handleJoinStream : handleStartStreaming}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    if (!isConnected && mode === 'viewer') {
      return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <p className="text-white mb-4">Click to join stream</p>
            <Button onClick={handleJoinStream}>Join Stream</Button>
          </div>
        </div>
      );
    }

    if (!isConnected && mode === 'streamer') {
      return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <p className="text-white mb-4">Ready to start streaming</p>
            <Button onClick={handleStartStreaming}>Start Stream</Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
      {/* Video Elements */}
      {mode === 'streamer' ? (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      )}

      {/* Fallback thumbnail when not connected */}
      {!isConnected && (
        <img
          src={stream.thumbnail}
          alt={stream.title}
          className="w-full h-full object-cover"
        />
      )}

      {/* Connection Status Overlay */}
      {renderConnectionStatus()}

      {/* Stream Overlays */}
      {showOverlays && isConnected && (
        <>
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-flux-accent-red px-2 py-1 rounded text-white text-xs font-bold animate-pulse">
                  LIVE
                </div>
                <div className="flex items-center space-x-2 text-white">
                  <Users className="w-4 h-4" />
                  <span>{formatNumber(viewerCount)}</span>
                </div>
                {mode === 'streamer' && (
                  <div className="text-green-400 text-sm">Streaming</div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {mode === 'streamer' && (
                  <>
                    <Button size="sm" variant="ghost" onClick={handleEndStreaming}>
                      End Stream
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={handleFullscreen}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
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

              <div className="flex items-center space-x-2">
                {/* Video Controls */}
                <Button size="sm" variant="ghost" onClick={handlePlayPause}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleMute}>
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>

                {mode === 'viewer' && (
                  <>
                    <Button size="sm" variant="secondary">
                      <Heart className="w-4 h-4 mr-1" />
                      Follow
                    </Button>
                    <Button size="sm" variant="primary">
                      <Gift className="w-4 h-4 mr-1" />
                      Gift
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recent Gifts Overlay */}
          <div className="absolute top-20 right-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="bg-flux-primary/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm"
              >
                🎁 Gift from Viewer{i + 1}
              </motion.div>
            ))}
          </div>

          {/* Stream Quality Indicator */}
          <div className="absolute top-4 left-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-white text-xs">720p</span>
            </div>
          </div>

          {/* Connection Statistics (Debug Info) */}
          {true && (
            <div className="absolute bottom-20 left-4 bg-black/80 text-white text-xs p-2 rounded">
              <div>Mode: {mode}</div>
              <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
              <div>Viewers: {viewerCount}</div>
            </div>
          )}
        </>
      )}

      {/* Click overlay to toggle controls */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => setShowOverlays(!showOverlays)}
        style={{ pointerEvents: showOverlays ? 'none' : 'all' }}
      />
    </div>
  );
};