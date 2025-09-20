import React, { useState, useEffect } from 'react';
import { ActorSubclass } from '@dfinity/agent';
import { Button } from '../ui/Button';
import { StreamPlayer } from './WebRTCStreamPlayer';
import { WebRTCStreamingService } from '../../lib/webrtcStreamingService';
import { useAppStore } from '../../store/appStore';
import type { LiveStream } from '../../store/appStore';

interface LiveStreamingProps {
  actor: ActorSubclass<any>;
  className?: string;
}

export const LiveStreamDemo: React.FC<LiveStreamingProps> = ({ actor, className }) => {
  const { currentUser, activeStreams, setActiveStreams } = useAppStore();
  const [webrtcService] = useState(() => new WebRTCStreamingService(actor));
  
  // Stream state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [viewingStreamId, setViewingStreamId] = useState('');
  
  // Form inputs
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [streamCategory, setStreamCategory] = useState('Gaming');
  
  // Status and logs
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [viewerCount, setViewerCount] = useState(0);
  const [connectionLogs, setConnectionLogs] = useState<string[]>([]);

  // Get current streams
  const currentStream = currentStreamId ? activeStreams.find(s => s.id === currentStreamId) : null;
  const viewingStream = viewingStreamId ? activeStreams.find(s => s.id === viewingStreamId) : null;

  // Helper functions for stream management
  const addStream = (stream: LiveStream) => {
    setActiveStreams([...activeStreams, stream]);
  };

  const removeStream = (streamId: string) => {
    setActiveStreams(activeStreams.filter(s => s.id !== streamId));
  };

  const updateStream = (streamId: string, updates: Partial<LiveStream>) => {
    setActiveStreams(activeStreams.map(s => s.id === streamId ? { ...s, ...updates } : s));
  };

  useEffect(() => {
    // Set up WebRTC service event handlers
    webrtcService.setEventHandlers({
      onStreamReceived: (stream: MediaStream) => {
        addLog('Stream received from broadcaster');
        setConnectionStatus('connected');
      },
      onStreamEnded: () => {
        addLog('Stream ended by broadcaster');
        handleStreamEnd();
      },
      onViewerCountChanged: (count: number) => {
        setViewerCount(count);
        addLog(`Viewer count updated: ${count}`);
        
        // Update stream in store
        if (currentStreamId && currentStream) {
          updateStream(currentStreamId, { ...currentStream, viewers: count });
        }
      }
    });

    return () => {
      webrtcService.disconnect();
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  const startStreaming = async () => {
    if (!currentUser) {
      addLog('Error: User not authenticated');
      return;
    }

    if (!streamTitle.trim()) {
      addLog('Error: Stream title is required');
      return;
    }

    try {
      setConnectionStatus('connecting');
      addLog('Starting stream...');
      
      const streamId = await webrtcService.startStreaming(
        streamTitle,
        streamDescription || 'Live stream',
        streamCategory
      );

      if (streamId) {
        setCurrentStreamId(streamId);
        setIsStreaming(true);
        setConnectionStatus('connected');
        
        // Add stream to global store
        const newStream: LiveStream = {
          id: streamId,
          title: streamTitle,
          thumbnail: currentUser.avatar || '/default-avatar.png',
          creator: {
            id: currentUser.id,
            username: currentUser.username,
            displayName: currentUser.displayName,
            avatar: currentUser.avatar || '/default-avatar.png'
          },
          viewers: 0,
          isLive: true,
          category: streamCategory
        };
        
        addStream(newStream);
        addLog(`Stream started successfully: ${streamId}`);
      } else {
        setConnectionStatus('error');
        addLog('Failed to start stream');
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      setConnectionStatus('error');
      addLog(`Error starting stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopStreaming = async () => {
    if (!currentStreamId) return;

    try {
      addLog('Stopping stream...');
      await webrtcService.endStream();
      
      // Remove from store
      removeStream(currentStreamId);
      
      // Reset state
      setIsStreaming(false);
      setCurrentStreamId(null);
      setConnectionStatus('disconnected');
      setViewerCount(0);
      
      addLog('Stream stopped successfully');
    } catch (error) {
      console.error('Error stopping stream:', error);
      addLog(`Error stopping stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const joinStream = async () => {
    if (!viewingStreamId.trim()) {
      addLog('Error: Please enter a stream ID');
      return;
    }

    // Prevent duplicate join attempts
    if (connectionStatus === 'connecting' || isViewing) {
      addLog('Already connecting or connected to a stream');
      return;
    }

    try {
      setConnectionStatus('connecting');
      addLog(`Joining stream: ${viewingStreamId}`);
      
      // Instead of calling webrtcService.joinStream directly,
      // we'll set up the stream and let StreamPlayer auto-connect
      setIsViewing(true);
      
      // Try to find existing stream in store or create placeholder
      let stream = activeStreams.find(s => s.id === viewingStreamId);
      if (!stream) {
        // Create placeholder stream
        stream = {
          id: viewingStreamId,
          title: 'Live Stream',
          thumbnail: '/default-avatar.png',
          creator: {
            id: 'unknown',
            username: 'Streamer',
            displayName: 'Live Streamer',
            avatar: '/default-avatar.png'
          },
          viewers: 0,
          isLive: true,
          category: 'Gaming'
        };
        addStream(stream);
      }
      
      // Set the viewing stream ID so the StreamPlayer component can auto-connect
      setViewingStreamId(stream.id);
      addLog('Stream setup complete, connecting...');
      
    } catch (error) {
      console.error('Error setting up stream:', error);
      setConnectionStatus('error');
      addLog('Failed to setup stream');
    }
  };

  const leaveStream = () => {
    addLog('Leaving stream...');
    webrtcService.disconnect();
    setIsViewing(false);
    setConnectionStatus('disconnected');
    addLog('Left stream');
  };

  const handleStreamEnd = () => {
    if (isStreaming && currentStreamId) {
      removeStream(currentStreamId);
      setIsStreaming(false);
      setCurrentStreamId(null);
    }
    setConnectionStatus('disconnected');
    setIsViewing(false);
  };

  const clearLogs = () => {
    setConnectionLogs([]);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-emerald-400';
      case 'connecting': return 'text-amber-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-emerald-500';
      case 'connecting': return 'bg-amber-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div 
      className={`min-h-screen ${className || ''}`}
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="backdrop-blur-xl rounded-2xl shadow-xl border border-gray-800 p-6 mb-8" style={{ backgroundColor: '#1a1a1a' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Live Streaming Studio
              </h1>
              <p className="text-gray-300 mt-1">Create and watch live streams with real-time interaction</p>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/80 rounded-xl border border-gray-700">
              <div className={`w-2.5 h-2.5 rounded-full ${getStatusBadge()}`}></div>
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* User Authentication Check */}
        {!currentUser && (
          <div className=" border border-amber-700/50 rounded-xl p-4 mb-6 backdrop-blur-sm" style={{ backgroundColor: '#1a1a1a' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-800/50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-amber-200 font-medium">Please authenticate to start streaming</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Streaming Section */}
          <div className="space-y-6">
            <div className="backdrop-blur-xl rounded-2xl shadow-xl border border-gray-800 p-6" style={{ backgroundColor: '#1a1a1a' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">Broadcast Stream</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stream Title *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-white"
                    placeholder="Enter your stream title"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    disabled={isStreaming}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 resize-none text-white"
                    placeholder="Describe your stream"
                    rows={3}
                    value={streamDescription}
                    onChange={(e) => setStreamDescription(e.target.value)}
                    disabled={isStreaming}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select
                    className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-white"
                    value={streamCategory}
                    onChange={(e) => setStreamCategory(e.target.value)}
                    disabled={isStreaming}
                  >
                    <option value="Gaming">🎮 Gaming</option>
                    <option value="JustChatting">💬 Just Chatting</option>
                    <option value="Music">🎵 Music</option>
                    <option value="Art">🎨 Art</option>
                    <option value="Technology">💻 Technology</option>
                    <option value="Education">📚 Education</option>
                  </select>
                </div>
                
                <div className="pt-2">
                  {!isStreaming ? (
                    <Button 
                      onClick={startStreaming} 
                      disabled={!streamTitle.trim() || !currentUser || connectionStatus === 'connecting'}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connectionStatus === 'connecting' ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Starting Stream...
                        </div>
                      ) : (
                        'Start Streaming'
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={stopStreaming} 
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200"
                    >
                      Stop Streaming
                    </Button>
                  )}
                </div>

                {currentStreamId && (
                  <div className="bg-emerald-900/40 border border-emerald-700/50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-emerald-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-emerald-200 mb-1">Stream Active</p>
                        <p className="text-xs text-emerald-300 font-mono break-all">
                          ID: {currentStreamId}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-emerald-300">{viewerCount} viewers</span>
                          </div>
                        </div>
                        <p className="text-xs text-emerald-400 mt-1">
                          Share this ID with viewers to join your stream
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Viewer Section
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">Watch Stream</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stream ID</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-white"
                    placeholder="Enter stream ID to join"
                    value={viewingStreamId}
                    onChange={(e) => setViewingStreamId(e.target.value)}
                    disabled={isViewing}
                  />
                </div>

                <div className="flex gap-3">
                  {!isViewing ? (
                    <Button 
                      onClick={joinStream} 
                      disabled={!viewingStreamId.trim() || connectionStatus === 'connecting'}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50"
                    >
                      {connectionStatus === 'connecting' ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Joining...
                        </div>
                      ) : (
                        'Join Stream'
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={leaveStream}
                      className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200"
                    >
                      Leave Stream
                    </Button>
                  )}
                </div>
              </div>
            </div> */}
          </div>

          {/* Video Player Section */}
          <div className="space-y-6">
            {/* Streamer Video Player */}
            {currentStream && isStreaming && (
              <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h3 className="font-semibold text-white">Your Stream Preview</h3>
                </div>
                <StreamPlayer
                  stream={currentStream}
                  mode="streamer"
                  webrtcService={webrtcService}
                  className="aspect-video"
                />
              </div>
            )}

            {/* Viewer Video Player
            {viewingStream && isViewing && (
              <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h3 className="font-semibold text-white">Watching: {viewingStream.title}</h3>
                </div>
                <StreamPlayer
                  stream={viewingStream}
                  mode="viewer"
                  webrtcService={webrtcService}
                  className="aspect-video"
                  onConnectionStatusChange={(status) => {
                    setConnectionStatus(status);
                    addLog(`Connection status: ${status}`);
                  }}
                />
              </div>
            )} */}

            {/* Connection Logs */}
            <div className="backdrop-blur-xl rounded-2xl shadow-xl border border-gray-800 p-6" style={{ backgroundColor: '#1a1a1a' }}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Connection Logs</h3>
                </div>
                <Button 
                  onClick={clearLogs} 
                  className="text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-all duration-200"
                  variant="ghost"
                  size="sm"
                >
                  Clear Logs
                </Button>
              </div>
              <div 
                className="rounded-xl p-4 h-48 overflow-y-auto"
                style={{ backgroundColor: '#1a1a1a' }}
              >
                <div className="font-mono text-sm space-y-1">
                  {connectionLogs.length === 0 ? (
                    <div className="text-gray-500 italic">No activity yet...</div>
                  ) : (
                    connectionLogs.map((log, index) => (
                      <div key={index} className="text-emerald-400 leading-relaxed">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};