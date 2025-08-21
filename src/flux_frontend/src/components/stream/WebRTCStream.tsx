import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings, 
  Users,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Camera,
  RotateCcw,
  Play,
  Square,
  Loader2,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import StreamingInterface from './StreamingInterface';

interface WebRTCStreamProps {
  streamId: string;
  isStreamer?: boolean;
  onStreamStart?: (stream: MediaStream) => void;
  onStreamEnd?: () => void;
  className?: string;
  canisterId: string;
  idlFactory: any;
  mode?: 'viewer' | 'streamer';
}

interface StreamSettings {
  video: {
    enabled: boolean;
    deviceId?: string;
    width: number;
    height: number;
    frameRate: number;
  };
  audio: {
    enabled: boolean;
    deviceId?: string;
    echoCancellation: boolean;
    noiseSuppression: boolean;
  };
}

interface DeviceInfo {
  videoDevices: MediaDeviceInfo[];
  audioDevices: MediaDeviceInfo[];
}

interface PermissionStatus {
  camera: PermissionState | 'unknown';
  microphone: PermissionState | 'unknown';
}

export const WebRTCStream: React.FC<WebRTCStreamProps> = ({
  streamId,
  isStreamer = false,
  onStreamStart,
  onStreamEnd,
  className,
  canisterId,
  idlFactory,
  mode = 'viewer'
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const [streamingInterfaceActive, setStreamingInterfaceActive] = useState(false);
  const [streamSettings, setStreamSettings] = useState<StreamSettings>({
    video: {
      enabled: true,
      width: 1280,
      height: 720,
      frameRate: 30
    },
    audio: {
      enabled: true,
      echoCancellation: true,
      noiseSuppression: true
    }
  });
  const [availableDevices, setAvailableDevices] = useState<DeviceInfo>({
    videoDevices: [],
    audioDevices: []
  });
  const [streamStats, setStreamStats] = useState({
    bitrate: 0,
    fps: 30,
    resolution: '1280x720',
    viewers: 0
  });
  const [showSettings, setShowSettings] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    camera: 'unknown',
    microphone: 'unknown'
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasPermissions, setHasPermissions] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasShownSuccessToast = useRef(false);
  const hasInitialized = useRef(false);
  const permissionRequestInProgress = useRef(false);

  // Check and request permissions
  const requestPermissions = useCallback(async () => {
    // Prevent multiple simultaneous permission requests
    if (permissionRequestInProgress.current) {
      console.log('Permission request already in progress, skipping...');
      return;
    }
    
    permissionRequestInProgress.current = true;
    setIsInitializing(true);
    
    try {
      console.log('Requesting camera and microphone permissions...');
      
      // Stop any existing stream first
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Clear video element before getting new stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      
      // Request permissions by trying to get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      console.log('Permissions granted, got stream:', stream);
      
      // Keep the stream for immediate use
      localStreamRef.current = stream;
      
      // Display the stream immediately with better error handling
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
        
        // Wait for metadata to load before playing
        const playPromise = localVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.warn('Video play failed, but continuing:', error);
            // Don't throw error here, as the stream is still valid
          });
        }
      }
      
      setPermissionStatus({
        camera: 'granted',
        microphone: 'granted'
      });
      setHasPermissions(true);
      setIsStreaming(true);
      setConnectionStatus('connected');
      
      // Get available devices
      await getAvailableDevices();
      
      // Start stats collection
      startStatsCollection();
      
      // Notify parent component
      onStreamStart?.(stream);
      
      // Only show success toast once
      if (!hasShownSuccessToast.current) {
        toast.success('Webcam connected successfully!');
        hasShownSuccessToast.current = true;
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            setPermissionStatus({
              camera: 'denied',
              microphone: 'denied'
            });
            toast.error('Camera/microphone access denied. Please allow permissions in your browser.');
            break;
          case 'NotFoundError':
            toast.error('No camera or microphone found. Please connect a device.');
            break;
          case 'NotReadableError':
            toast.error('Camera/microphone is already in use by another application.');
            break;
          default:
            toast.error('Failed to access camera/microphone. Please check your device.');
        }
      }
      setHasPermissions(false);
      setConnectionStatus('failed');
    } finally {
      setIsInitializing(false);
      permissionRequestInProgress.current = false;
    }
  }, [onStreamStart]);

  // Get available devices
  const getAvailableDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      setAvailableDevices({ videoDevices, audioDevices });
      console.log('Available devices:', { videoDevices, audioDevices });
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  }, []);

  // Get user media stream with new settings
  const getUserMediaStream = useCallback(async (): Promise<MediaStream | null> => {
    try {
      console.log('Getting media stream with settings:', streamSettings);
      
      const constraints: MediaStreamConstraints = {
        video: streamSettings.video.enabled ? {
          deviceId: streamSettings.video.deviceId ? { exact: streamSettings.video.deviceId } : undefined,
          width: { ideal: streamSettings.video.width },
          height: { ideal: streamSettings.video.height },
          frameRate: { ideal: streamSettings.video.frameRate }
        } : false,
        audio: streamSettings.audio.enabled ? {
          deviceId: streamSettings.audio.deviceId ? { exact: streamSettings.audio.deviceId } : undefined,
          echoCancellation: streamSettings.audio.echoCancellation,
          noiseSuppression: streamSettings.audio.noiseSuppression,
          autoGainControl: true
        } : false
      };

      console.log('Media constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Got new media stream:', stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            toast.error('Camera/microphone access denied.');
            break;
          case 'NotFoundError':
            toast.error('No camera or microphone found.');
            break;
          case 'NotReadableError':
            toast.error('Camera/microphone is already in use.');
            break;
          case 'OverconstrainedError':
            toast.error('Camera/microphone settings not supported. Using defaults...');
            // Retry with basic constraints
            try {
              const basicStream = await navigator.mediaDevices.getUserMedia({
                video: streamSettings.video.enabled,
                audio: streamSettings.audio.enabled
              });
              return basicStream;
            } catch (retryError) {
              console.error('Retry failed:', retryError);
              return null;
            }
          default:
            toast.error('Failed to access camera/microphone.');
        }
      }
      return null;
    }
  }, [streamSettings]);

  // Stop streaming
  const stopStream = useCallback(() => {
    try {
      // Stop all tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          console.log('Stopping track:', track.kind);
          track.stop();
        });
        localStreamRef.current = null;
      }

      // Clear video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      // Stop stats collection
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      setIsStreaming(false);
      setConnectionStatus('disconnected');
      onStreamEnd?.();
      
      // Reset toast flag when stream ends
      hasShownSuccessToast.current = false;

      toast('Webcam disconnected');
    } catch (error) {
      console.error('Error stopping stream:', error);
      toast.error('Error stopping stream');
    }
  }, [onStreamEnd]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setStreamSettings(prev => ({
          ...prev,
          video: { ...prev.video, enabled: videoTrack.enabled }
        }));
        toast(videoTrack.enabled ? 'Video enabled' : 'Video disabled');
      }
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setStreamSettings(prev => ({
          ...prev,
          audio: { ...prev.audio, enabled: audioTrack.enabled }
        }));
        toast(audioTrack.enabled ? 'Audio enabled' : 'Audio disabled');
      }
    }
  }, []);

  // Apply settings changes
  const applySettings = useCallback(async () => {
    if (!isStreaming) return;
    
    setIsConnecting(true);
    toast('Applying new settings...');
    
    try {
      // Pause video element first
      if (localVideoRef.current) {
        localVideoRef.current.pause();
        localVideoRef.current.srcObject = null;
      }

      // Stop current stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get new stream with updated settings
      const newStream = await getUserMediaStream();
      
      if (newStream) {
        localStreamRef.current = newStream;
        
        // Display new stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
          
          const playPromise = localVideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.warn('Video play failed after settings change:', error);
            });
          }
        }
        
        onStreamStart?.(newStream);
        toast.success('Settings applied successfully!');
      } else {
        throw new Error('Failed to get new stream');
      }
    } catch (error) {
      console.error('Error applying settings:', error);
      toast.error('Failed to apply settings');
      setConnectionStatus('failed');
    } finally {
      setIsConnecting(false);
    }
  }, [isStreaming, getUserMediaStream, onStreamStart]);

  // Start stats collection
  const startStatsCollection = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    statsIntervalRef.current = setInterval(() => {
      setStreamStats(prev => ({
        ...prev,
        bitrate: Math.floor(Math.random() * 1000) + 500, // Simulated
        fps: streamSettings.video.frameRate,
        resolution: `${streamSettings.video.width}x${streamSettings.video.height}`,
        viewers: Math.floor(Math.random() * 100) + 1
      }));
    }, 1000);
  }, [streamSettings.video.frameRate, streamSettings.video.width, streamSettings.video.height]);

  // Handle mode changes
  useEffect(() => {
    console.log('Mode changed to:', mode);
    
    // Don't initialize multiple times
    if (hasInitialized.current && mode === 'streamer') {
      console.log('Already initialized for streamer mode, skipping...');
      return;
    }
    
    if (mode === 'streamer' && !isStreaming && !isInitializing) {
      // Reset initialization flag when switching to streamer mode
      hasInitialized.current = false;
      console.log('Switching to streamer mode, requesting permissions...');
      requestPermissions();
    } else if (mode === 'viewer') {
      // Clean up when switching to viewer mode
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      setIsStreaming(false);
      setHasPermissions(false);
      setConnectionStatus('disconnected');
      hasInitialized.current = false;
      console.log('Viewer mode: waiting for stream to be available');
    }
  }, [mode]);

  // Initialize on mount
  useEffect(() => {
    let mounted = true;
    
    const initializeStream = async () => {
      if (!mounted) return;
      
      // Prevent multiple initialization attempts
      if (hasInitialized.current) {
        console.log('Stream already initialized, skipping...');
        return;
      }
      
      if (mode === 'streamer') {
        console.log('Auto-initializing stream for streamer mode...');
        hasInitialized.current = true;
        await requestPermissions();
      } else if (mode === 'viewer') {
        // For viewers, show a placeholder or try to connect to existing stream
        setIsInitializing(false);
        setConnectionStatus('disconnected');
        setIsStreaming(false);
        setHasPermissions(false);
        console.log('Viewer mode: waiting for stream to be available');
      }
    };

    // Listen for force restart events
    const handleForceRestart = (event: CustomEvent) => {
      console.log('Force restart requested:', event.detail);
      if (event.detail.mode === 'streamer' && mode === 'streamer') {
        hasInitialized.current = false;
        // Auto-start if specified
        if (event.detail.autoStart) {
          console.log('Auto-starting stream for streamer...');
        }
        requestPermissions();
      }
    };

    window.addEventListener('forceStreamRestart', handleForceRestart as EventListener);
    initializeStream();

    return () => {
      mounted = false;
      window.removeEventListener('forceStreamRestart', handleForceRestart as EventListener);
      // Cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
      // Reset initialization flag on unmount
      hasInitialized.current = false;
      permissionRequestInProgress.current = false;
    };
  }, [mode, requestPermissions]);

  // Handle video element events
  useEffect(() => {
    const videoElement = localVideoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded');
      // Don't auto-play here, let the stream setup handle it
    };

    const handleCanPlay = () => {
      console.log('Video can play');
    };

    const handleError = (e: Event) => {
      const error = (e.target as HTMLVideoElement)?.error;
      if (error) {
        console.warn('Video error (non-critical):', error.code, error.message);
        // Don't show toast for abort errors as they're often expected during stream changes
        if (error.code !== MediaError.MEDIA_ERR_ABORTED) {
          console.error('Critical video error:', error);
        }
      }
    };

    const handleAbort = () => {
      console.log('Video playback aborted (this is normal during stream changes)');
    };

    const handleLoadStart = () => {
      console.log('Video load started');
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('abort', handleAbort);
    videoElement.addEventListener('loadstart', handleLoadStart);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('abort', handleAbort);
      videoElement.removeEventListener('loadstart', handleLoadStart);
    };
  }, []);

  // Connection status indicator
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-flux-accent-green';
      case 'connecting': return 'text-yellow-500';
      case 'failed': return 'text-flux-accent-red';
      default: return 'text-flux-text-secondary';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return CheckCircle;
      case 'connecting': return Wifi;
      case 'failed': return AlertCircle;
      default: return WifiOff;
    }
  };

  const ConnectionIcon = getConnectionStatusIcon();

  return (
    <div className={cn("flex flex-col h-full bg-flux-bg-secondary", className)}>
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between p-4 border-b border-flux-bg-tertiary">
        <div className="flex items-center space-x-3">
          <h3 className="font-semibold text-flux-text-primary">
            {streamingInterfaceActive ? 'Game Streaming' : (isStreamer ? 'Webcam Stream' : 'Live Stream')}
          </h3>
          <div className={cn("flex items-center space-x-1", getConnectionStatusColor())}>
            <ConnectionIcon className="w-4 h-4" />
            <span className="text-sm capitalize">{connectionStatus}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
                    {/* Mode Toggle */}
          {mode === 'streamer' && canisterId && (
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={!streamingInterfaceActive ? "primary" : "secondary"}
                onClick={() => setStreamingInterfaceActive(false)}
                disabled={isStreaming}
              >
                📹 WebRTC
              </Button>
              <Button
                size="sm"
                variant={streamingInterfaceActive ? "primary" : "secondary"}
                onClick={() => setStreamingInterfaceActive(true)}
                disabled={isStreaming}
              >
                🎮 Game Stream
              </Button>
            </div>
          )}

          {!streamingInterfaceActive && isStreaming && (
            <div className="flex items-center space-x-4 text-sm text-flux-text-secondary">
              <span>{streamStats.bitrate} kbps</span>
              <span>{streamStats.fps} fps</span>
              <span>{streamStats.resolution}</span>
              <div className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{streamStats.viewers}</span>
              </div>
            </div>
          )}
          
          {!streamingInterfaceActive && mode === 'streamer' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {streamingInterfaceActive && canisterId && idlFactory ? (
          // StreamingInterface Mode
          <StreamingInterface
            mode={mode}
            streamId={streamId}
            canisterId={canisterId}
            idlFactory={idlFactory}
          />
        ) : (
          // WebRTC Mode
          <div className="h-full flex flex-col">
            {/* Video Container */}
            <div className="flex-1 relative bg-black">
              {/* Video Element */}
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Stream Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

              {/* Permission Request Overlay */}
              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-flux-bg-tertiary">
                  <div className="text-center">
                    <Loader2 className="w-16 h-16 text-flux-primary mx-auto mb-4 animate-spin" />
                    <p className="text-flux-text-primary font-semibold mb-2">
                      Connecting to Webcam
                    </p>
                    <p className="text-flux-text-secondary text-sm">
                      Please allow camera and microphone access
                    </p>
                  </div>
                </div>
              )}

              {/* Permission Denied Overlay */}
              {!isInitializing && !hasPermissions && (
                <div className="absolute inset-0 flex items-center justify-center bg-flux-bg-tertiary">
                  <div className="text-center max-w-md p-6">
                    <Shield className="w-16 h-16 text-flux-accent-red mx-auto mb-4" />
                    <p className="text-flux-text-primary font-semibold mb-2">
                      Camera Access Required
                    </p>
                    <p className="text-flux-text-secondary text-sm mb-4">
                      To start streaming, please allow camera and microphone access in your browser settings.
                    </p>
                    <Button onClick={requestPermissions}>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                </div>
              )}

              {/* Start Stream Button for Streamers */}
              {mode === 'streamer' && !isInitializing && !isStreaming && hasPermissions && (
                <div className="absolute inset-0 flex items-center justify-center bg-flux-bg-tertiary">
                  <div className="text-center max-w-md p-6">
                    <Camera className="w-16 h-16 text-flux-primary mx-auto mb-4" />
                    <p className="text-flux-text-primary font-semibold mb-2">
                      Ready to Stream
                    </p>
                    <p className="text-flux-text-secondary text-sm mb-4">
                      Camera and microphone are ready. Click below to start your stream.
                    </p>
                    <Button onClick={requestPermissions}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Stream
                    </Button>
                  </div>
                </div>
              )}

              {/* Viewer Mode - No Stream Available */}
              {mode === 'viewer' && !isInitializing && !isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center bg-flux-bg-tertiary">
                  <div className="text-center max-w-md p-6">
                    <Video className="w-16 h-16 text-flux-text-secondary mx-auto mb-4" />
                    <p className="text-flux-text-primary font-semibold mb-2">
                      Stream Not Available
                    </p>
                    <p className="text-flux-text-secondary text-sm mb-4">
                      This stream is currently offline or not available.
                    </p>
                  </div>
                </div>
              )}

              {/* Controls Overlay */}
              {mode === 'streamer' && isStreaming && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center justify-between">
                    {/* Stream Info */}
                    <div className="text-white">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-3 h-3 bg-flux-accent-red rounded-full animate-pulse" />
                        <p className="font-semibold">LIVE</p>
                      </div>
                      <p className="text-white/70 text-sm">
                        {streamSettings.video.enabled ? 'Video On' : 'Video Off'} • 
                        {streamSettings.audio.enabled ? ' Audio On' : ' Audio Off'}
                      </p>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant={streamSettings.video.enabled ? "secondary" : "danger"}
                        onClick={toggleVideo}
                        disabled={isConnecting}
                      >
                        {streamSettings.video.enabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      </Button>

                      <Button
                        size="sm"
                        variant={streamSettings.audio.enabled ? "secondary" : "danger"}
                        onClick={toggleAudio}
                        disabled={isConnecting}
                      >
                        {streamSettings.audio.enabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        onClick={stopStream}
                        disabled={isConnecting}
                      >
                        <Square className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Connecting Overlay */}
              {isConnecting && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-white mx-auto mb-4 animate-spin" />
                    <p className="text-white font-semibold">Updating stream...</p>
                  </div>
                </div>
              )}
            </div>

            {/* WebRTC Settings Panel */}
            <AnimatePresence>
              {showSettings && mode === 'streamer' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-flux-bg-tertiary overflow-hidden"
                >
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-flux-text-primary">WebRTC Settings</h4>
                      <Button
                        size="sm"
                        onClick={applySettings}
                        disabled={!isStreaming || isConnecting}
                        isLoading={isConnecting}
                      >
                        Apply Changes
                      </Button>
                    </div>
                    
                    {/* Video Quality */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-flux-text-primary">Video Quality</label>
                        <select
                          value={`${streamSettings.video.width}x${streamSettings.video.height}`}
                          onChange={(e) => {
                            const [width, height] = e.target.value.split('x').map(Number);
                            setStreamSettings(prev => ({
                              ...prev,
                              video: { ...prev.video, width, height }
                            }));
                          }}
                          className="w-full px-3 py-2 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary"
                        >
                          <option value="640x480">480p (640x480)</option>
                          <option value="1280x720">720p (1280x720)</option>
                          <option value="1920x1080">1080p (1920x1080)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-flux-text-primary">Frame Rate</label>
                        <select
                          value={streamSettings.video.frameRate}
                          onChange={(e) => {
                            setStreamSettings(prev => ({
                              ...prev,
                              video: { ...prev.video, frameRate: Number(e.target.value) }
                            }));
                          }}
                          className="w-full px-3 py-2 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary"
                        >
                          <option value={15}>15 FPS</option>
                          <option value={24}>24 FPS</option>
                          <option value={30}>30 FPS</option>
                          <option value={60}>60 FPS</option>
                        </select>
                      </div>
                    </div>

                    {/* Audio Settings */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-flux-text-primary">Audio Enhancement</label>
                      <div className="grid md:grid-cols-2 gap-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={streamSettings.audio.echoCancellation}
                            onChange={(e) => {
                              setStreamSettings(prev => ({
                                ...prev,
                                audio: { ...prev.audio, echoCancellation: e.target.checked }
                              }));
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-flux-text-primary">Echo Cancellation</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={streamSettings.audio.noiseSuppression}
                            onChange={(e) => {
                              setStreamSettings(prev => ({
                                ...prev,
                                audio: { ...prev.audio, noiseSuppression: e.target.checked }
                              }));
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-flux-text-primary">Noise Suppression</span>
                        </label>
                      </div>
                    </div>

                    {/* Device Selection */}
                    {availableDevices.videoDevices.length > 0 && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-flux-text-primary">Camera</label>
                          <select
                            value={streamSettings.video.deviceId || ''}
                            onChange={(e) => {
                              setStreamSettings(prev => ({
                                ...prev,
                                video: { ...prev.video, deviceId: e.target.value || undefined }
                              }));
                            }}
                            className="w-full px-3 py-2 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary"
                          >
                            <option value="">Default Camera</option>
                            {availableDevices.videoDevices.map((device) => (
                              <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {availableDevices.audioDevices.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-flux-text-primary">Microphone</label>
                            <select
                              value={streamSettings.audio.deviceId || ''}
                              onChange={(e) => {
                                setStreamSettings(prev => ({
                                  ...prev,
                                  audio: { ...prev.audio, deviceId: e.target.value || undefined }
                                }));
                              }}
                              className="w-full px-3 py-2 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary"
                            >
                              <option value="">Default Microphone</option>
                              {availableDevices.audioDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Permission Status */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-flux-text-primary">Permission Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={cn(
                          "p-3 rounded-lg text-sm font-medium",
                          permissionStatus.camera === 'granted' 
                            ? 'bg-flux-accent-green/20 text-flux-accent-green' 
                            : 'bg-flux-accent-red/20 text-flux-accent-red'
                        )}>
                          <div className="flex items-center space-x-2">
                            {permissionStatus.camera === 'granted' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                            <span>Camera: {permissionStatus.camera}</span>
                          </div>
                        </div>
                        <div className={cn(
                          "p-3 rounded-lg text-sm font-medium",
                          permissionStatus.microphone === 'granted' 
                            ? 'bg-flux-accent-green/20 text-flux-accent-green' 
                            : 'bg-flux-accent-red/20 text-flux-accent-red'
                        )}>
                          <div className="flex items-center space-x-2">
                            {permissionStatus.microphone === 'granted' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                            <span>Microphone: {permissionStatus.microphone}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Refresh Devices */}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={getAvailableDevices}
                      className="w-full"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Refresh Devices
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};