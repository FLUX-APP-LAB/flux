import React, { useState, useEffect, useRef } from 'react';
import { GameStreamer, StreamStats, StreamStartOptions } from '../../lib/streaming/GameStreamer';
import { StreamViewer, ViewerStats } from '../../lib/streaming/StreamViewer';
import { useWallet } from '../../hooks/useWallet';
import { HttpAgent } from '@dfinity/agent';

interface StreamingInterfaceProps {
  mode?: 'viewer' | 'streamer';
  streamId?: string | null;
  canisterId: string;
  idlFactory: any;
}

interface StreamInfo {
  title: string;
  streamId: string;
  category: string;
}

interface StreamData {
  streamerId: string;
  viewerCount: number;
  isActive: boolean;
}

interface StreamSettings {
  title: string;
  category: string;
  maxViewers: number;
  frameRate: number;
  resolution: {
    width: number;
    height: number;
  };
}

const StreamingInterface: React.FC<StreamingInterfaceProps> = ({ 
  mode = 'viewer', 
  streamId = null, 
  canisterId, 
  idlFactory 
}) => {
  const { identity, isAuthenticated } = useWallet();
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [stats, setStats] = useState<StreamStats | ViewerStats | null>(null);
  const [activeStreams, setActiveStreams] = useState<Array<[string, StreamData]>>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<string>('unknown');
  
  const streamerRef = useRef<GameStreamer | null>(null);
  const viewerRef = useRef<StreamViewer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Streaming settings
  const [streamSettings, setStreamSettings] = useState<StreamSettings>({
    title: '',
    category: 'Gaming',
    maxViewers: 100,
    frameRate: 30,
    resolution: { width: 1920, height: 1080 }
  });

  // Create agent when identity is available
  const createAgent = () => {
    if (!identity) return null;
    
    const network = import.meta.env.VITE_DFX_NETWORK || 'local';
    const isLocal = network === 'local' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    return new HttpAgent({ 
      identity,
      host: isLocal ? 'http://localhost:4943' : 'https://ic0.app'
    });
  };

  useEffect(() => {
    if (identity && canisterId && idlFactory && isAuthenticated) {
      initializeService();
    } else {
      console.log('StreamingInterface: Missing required dependencies', {
        hasIdentity: !!identity,
        hasCanisterId: !!canisterId,
        hasIdlFactory: !!idlFactory,
        isAuthenticated
      });
      // Show appropriate error state
      if (!isAuthenticated) {
        setError('Please connect your wallet to use streaming features');
      }
    }
  }, [identity, canisterId, idlFactory, isAuthenticated]);

    useEffect(() => {
        // Set up event listeners
        const handleStreamStarted = (event: CustomEvent<StreamInfo>) => {
            setStreamInfo(event.detail);
            setIsStreaming(true);
        };

        const handleStreamEnded = (event: CustomEvent) => {
            setIsStreaming(false);
            setStreamInfo(null);
        };

        const handleStreamConnected = () => {
            setIsWatching(true);
            setError(null);
        };

        const handleViewerConnected = (event: CustomEvent) => {
            updateStats();
        };

        const handleViewerDisconnected = (event: CustomEvent) => {
            updateStats();
        };

        const handleConnectionQualityChanged = (event: CustomEvent<{quality: string}>) => {
            setConnectionQuality(event.detail.quality);
        };

        window.addEventListener('streamStarted', handleStreamStarted as EventListener);
        window.addEventListener('streamEnded', handleStreamEnded as EventListener);
        window.addEventListener('streamConnected', handleStreamConnected as EventListener);
        window.addEventListener('viewerConnected', handleViewerConnected as EventListener);
        window.addEventListener('viewerDisconnected', handleViewerDisconnected as EventListener);
        window.addEventListener('connectionQualityChanged', handleConnectionQualityChanged as EventListener);

        return () => {
            window.removeEventListener('streamStarted', handleStreamStarted as EventListener);
            window.removeEventListener('streamEnded', handleStreamEnded as EventListener);
            window.removeEventListener('streamConnected', handleStreamConnected as EventListener);
            window.removeEventListener('viewerConnected', handleViewerConnected as EventListener);
            window.removeEventListener('viewerDisconnected', handleViewerDisconnected as EventListener);
            window.removeEventListener('connectionQualityChanged', handleConnectionQualityChanged as EventListener);
        };
    }, []);

    // Periodic stats update
    useEffect(() => {
        if (isStreaming || isWatching) {
            const interval = setInterval(updateStats, 5000);
            return () => clearInterval(interval);
        }
    }, [isStreaming, isWatching]);

    // Load active streams
    useEffect(() => {
        if (mode === 'viewer') {
            loadActiveStreams();
            const interval = setInterval(loadActiveStreams, 10000);
            return () => clearInterval(interval);
        }
    }, [mode]);

    const initializeService = async () => {
        try {
            const agent = createAgent();
            if (!agent) {
                console.log('No agent available, running in demo mode');
                // For demo mode, we'll simulate the streaming without actual ICP calls
                return;
            }

            if (mode === 'streamer') {
                streamerRef.current = new GameStreamer(canisterId, agent);
                await streamerRef.current.initialize(idlFactory);
            } else {
                viewerRef.current = new StreamViewer(canisterId, agent);
                await viewerRef.current.initialize(idlFactory);
            }
        } catch (error) {
            console.error('Failed to initialize streaming service:', error);
            setError(`Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const startStream = async () => {
        try {
            setError(null);
            
            if (!streamerRef.current) {
                // Demo mode - simulate stream start
                console.log('Starting demo stream...');
                setIsStreaming(true);
                setStreamInfo({
                    title: streamSettings.title || 'Demo Stream',
                    streamId: 'demo-stream-' + Date.now(),
                    category: streamSettings.category
                });
                
                // Dispatch custom event for demo
                window.dispatchEvent(new CustomEvent('streamStarted', {
                    detail: { 
                        streamId: 'demo-stream-' + Date.now(),
                        title: streamSettings.title || 'Demo Stream',
                        category: streamSettings.category
                    }
                }));
                return;
            }

            const result = await streamerRef.current.startGameStream(streamSettings.title, {
                category: streamSettings.category,
                maxViewers: streamSettings.maxViewers,
                frameRate: streamSettings.frameRate,
                width: streamSettings.resolution.width,
                height: streamSettings.resolution.height
            });

            if (!result.success) {
                setError(result.error || 'Failed to start stream');
            }
        } catch (error) {
            setError(`Failed to start stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const stopStream = async () => {
        try {
            if (!streamerRef.current) {
                // Demo mode - simulate stream stop
                console.log('Stopping demo stream...');
                setIsStreaming(false);
                setStreamInfo(null);
                
                // Dispatch custom event for demo
                window.dispatchEvent(new CustomEvent('streamEnded', {
                    detail: {}
                }));
                return;
            }

            await streamerRef.current.stopStream();
        } catch (error) {
            setError(`Failed to stop stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const watchStream = async (targetStreamId: string) => {
        if (!viewerRef.current || !videoRef.current) return;

        try {
            setError(null);
            const result = await viewerRef.current.watchStream(targetStreamId, videoRef.current.id);

            if (!result.success) {
                setError(result.error || 'Failed to watch stream');
            }
        } catch (error) {
            setError(`Failed to watch stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const leaveStream = async () => {
        if (!viewerRef.current) return;

        try {
            await viewerRef.current.leaveStream();
            setIsWatching(false);
        } catch (error) {
            setError(`Failed to leave stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const updateStats = () => {
        if (streamerRef.current && 'getStats' in streamerRef.current) {
            const stats = (streamerRef.current as any).getStats();
            setStats(stats);
        } else if (viewerRef.current && 'getStats' in viewerRef.current) {
            const stats = (viewerRef.current as any).getStats();
            setStats(stats);
        }
    };

    const loadActiveStreams = async () => {
        try {
            if (viewerRef.current && (viewerRef.current as any).icpActor) {
                const streams = await (viewerRef.current as any).icpActor.getActiveStreams();
                setActiveStreams(streams);
            }
        } catch (error) {
            console.error('Failed to load active streams:', error);
        }
    };

    const getConnectionQualityColor = (quality: string) => {
        switch (quality) {
            case 'excellent': return 'text-green-600';
            case 'good': return 'text-blue-600';
            case 'fair': return 'text-yellow-600';
            case 'poor': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    if (mode === 'streamer') {
        return (
            <div className="streaming-interface bg-gray-900 text-white p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-6">Game Streaming Dashboard</h2>
                
                {error && (
                    <div className="bg-red-600 text-white p-4 rounded mb-4">
                        {error}
                    </div>
                )}

                {!isStreaming ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Stream Title</label>
                            <input
                                type="text"
                                value={streamSettings.title}
                                onChange={(e) => setStreamSettings({ ...streamSettings, title: e.target.value })}
                                className="w-full p-3 bg-gray-800 border border-gray-700 rounded"
                                placeholder="Enter stream title..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Category</label>
                            <select
                                value={streamSettings.category}
                                onChange={(e) => setStreamSettings({ ...streamSettings, category: e.target.value })}
                                className="w-full p-3 bg-gray-800 border border-gray-700 rounded"
                            >
                                <option value="Gaming">Gaming</option>
                                <option value="JustChatting">Just Chatting</option>
                                <option value="Music">Music</option>
                                <option value="Art">Art</option>
                                <option value="IRL">IRL</option>
                                <option value="Technology">Technology</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Max Viewers</label>
                                <input
                                    type="number"
                                    value={streamSettings.maxViewers}
                                    onChange={(e) => setStreamSettings({ ...streamSettings, maxViewers: parseInt(e.target.value) })}
                                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded"
                                    min="1"
                                    max="500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Frame Rate</label>
                                <select
                                    value={streamSettings.frameRate}
                                    onChange={(e) => setStreamSettings({ ...streamSettings, frameRate: parseInt(e.target.value) })}
                                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded"
                                >
                                    <option value={30}>30 FPS</option>
                                    <option value={60}>60 FPS</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={startStream}
                            disabled={!streamSettings.title.trim()}
                            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded"
                        >
                            🎮 Start Gaming Stream
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-green-600 p-4 rounded">
                            <h3 className="font-bold">🔴 LIVE: {streamInfo?.title}</h3>
                            <p>Stream ID: {streamInfo?.streamId}</p>
                        </div>

                        {stats && (
                            <div className="bg-gray-800 p-4 rounded">
                                <h4 className="font-semibold mb-2">Stream Statistics</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {'viewerCount' in stats && (
                                        <>
                                            <div>👥 Viewers: {stats.viewerCount}</div>
                                            <div>📊 Total Viewers: {stats.totalViewers}</div>
                                            <div>⏱️ Duration: {Math.floor((stats.duration || 0) / 60000)}m</div>
                                            <div>📶 Frame Rate: {(stats as any).frameRate || 0} FPS</div>
                                            <div>📈 Bitrate: {Math.round((stats.averageBitrate || 0) / 1000)} kbps</div>
                                            <div>❌ Failures: {stats.connectionFailures || 0}</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={stopStream}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded"
                        >
                            🛑 Stop Stream
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Viewer mode
    return (
        <div className="streaming-interface bg-gray-900 text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-6">Watch Live Streams</h2>
            
            {error && (
                <div className="bg-red-600 text-white p-4 rounded mb-4">
                    {error}
                </div>
            )}

            {!isWatching ? (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Active Streams</h3>
                    
                    {activeStreams.length === 0 ? (
                        <div className="text-gray-400 text-center py-8">
                            No active streams found. Check back later!
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {activeStreams.map(([streamId, streamData]) => (
                                <div key={streamId} className="bg-gray-800 p-4 rounded border border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-semibold">Stream {streamId.slice(-8)}</h4>
                                            <p className="text-sm text-gray-400">
                                                Streamer: {streamData.streamerId.slice(0, 8)}...
                                            </p>
                                            <p className="text-sm">👥 {streamData.viewerCount} viewers</p>
                                        </div>
                                        <button
                                            onClick={() => watchStream(streamId)}
                                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                                        >
                                            📺 Watch
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {streamId && (
                        <div className="border-t border-gray-700 pt-4">
                            <h3 className="text-lg font-semibold mb-2">Direct Stream Access</h3>
                            <button
                                onClick={() => watchStream(streamId)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                📺 Watch Stream {streamId.slice(-8)}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold">📺 Watching Stream</h3>
                            <p className="text-sm text-gray-400">
                                Connection: <span className={getConnectionQualityColor(connectionQuality)}>
                                    {connectionQuality}
                                </span>
                            </p>
                        </div>
                        <button
                            onClick={leaveStream}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                        >
                            ❌ Leave Stream
                        </button>
                    </div>

                    <div className="relative bg-black rounded overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        <video
                            ref={videoRef}
                            id="stream-video"
                            className="w-full h-full"
                            controls
                            autoPlay
                            muted={false}
                            playsInline
                        />
                    </div>

                    {stats && (
                        <div className="bg-gray-800 p-4 rounded">
                            <h4 className="font-semibold mb-2">Stream Statistics</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {'watchTime' in stats && (
                                    <>
                                        <div>⏱️ Watch Time: {Math.floor((stats.watchTime || 0) / 60000)}m</div>
                                        <div>📊 Frame Rate: {(stats as any).frameRate || 0} FPS</div>
                                        <div>📺 Resolution: {stats.resolution?.width || 0}x{stats.resolution?.height || 0}</div>
                                        <div>📶 Quality: <span className={getConnectionQualityColor(stats.connectionQuality)}>{stats.connectionQuality}</span></div>
                                        <div>📈 Data Received: {Math.round((stats.bytesReceived || 0) / 1024 / 1024)} MB</div>
                                        <div>📉 Packets Lost: {stats.packetsLost || 0}</div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StreamingInterface;
