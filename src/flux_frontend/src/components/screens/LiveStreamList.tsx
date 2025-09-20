import React, { useState, useEffect } from 'react';
import { ActorSubclass } from '@dfinity/agent';
import { Button } from '../ui/Button';
import { StreamPlayer } from '../stream/WebRTCStreamPlayer';
import { WebRTCStreamingService } from '../../lib/webrtcStreamingService';
import { useAppStore } from '../../store/appStore';
import { useWallet } from '../../hooks/useWallet';
import type { LiveStream } from '../../store/appStore';

interface LiveStreamListProps {
  className?: string;
}

export const LiveStreamList: React.FC<LiveStreamListProps> = ({ className }) => {
  const { activeStreams, setActiveStreams } = useAppStore();
  const { newAuthActor } = useWallet();
  const [webrtcService, setWebrtcService] = useState<WebRTCStreamingService | null>(null);
  
  // Initialize WebRTC service when actor is available
  useEffect(() => {
    if (newAuthActor && !webrtcService) {
      const service = new WebRTCStreamingService(newAuthActor);
      setWebrtcService(service);
    }
  }, [newAuthActor, webrtcService]);
  
  // Viewing state
  const [isViewing, setIsViewing] = useState(false);
  const [viewingStreamId, setViewingStreamId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [connectionLogs, setConnectionLogs] = useState<string[]>([]);

  // Manual join input
  const [manualStreamId, setManualStreamId] = useState('');

  // Get viewing stream
  const viewingStream = viewingStreamId ? activeStreams.find(s => s.id === viewingStreamId) : null;

  // Helper functions
  const addStream = (stream: LiveStream) => {
    setActiveStreams([...activeStreams, stream]);
  };

  const updateStream = (streamId: string, updates: Partial<LiveStream>) => {
    setActiveStreams(activeStreams.map(s => s.id === streamId ? { ...s, ...updates } : s));
  };

  useEffect(() => {
    // Only set up event handlers if webrtcService is available
    if (!webrtcService) return;
    
    // Set up WebRTC service event handlers for viewing
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
        addLog(`Viewer count updated: ${count}`);
        
        // Update stream in store
        if (viewingStreamId && viewingStream) {
          updateStream(viewingStreamId, { ...viewingStream, viewers: count });
        }
      }
    });

    return () => {
      webrtcService.disconnect();
    };
  }, [webrtcService, viewingStreamId, viewingStream]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  const joinStream = async (stream: LiveStream) => {
    // Prevent duplicate join attempts
    if (connectionStatus === 'connecting' || isViewing) {
      addLog('Already connecting or connected to a stream');
      return;
    }

    if (!webrtcService) {
      addLog('Error: WebRTC service not available');
      return;
    }

    try {
      setConnectionStatus('connecting');
      addLog(`Joining stream: ${stream.id}`);
      
      setIsViewing(true);
      setViewingStreamId(stream.id);
      
      // Ensure stream is in store
      if (!activeStreams.find(s => s.id === stream.id)) {
        addStream(stream);
      }
      
      // Actually call the WebRTC service to join the stream
      addLog('Initiating WebRTC connection...');
      await webrtcService.joinStream(stream.id);
      
    } catch (error) {
      console.error('Error joining stream:', error);
      setConnectionStatus('error');
      setIsViewing(false);
      setViewingStreamId(null);
      const errorMsg = (error instanceof Error) ? error.message : JSON.stringify(error);
      addLog(`Failed to join stream: ${errorMsg}`);
    }
  };

  const joinStreamById = async () => {
    if (!manualStreamId.trim()) {
      addLog('Error: Please enter a stream ID');
      return;
    }

    if (!webrtcService) {
      addLog('Error: WebRTC service not available');
      return;
    }

    // Prevent duplicate join attempts
    if (connectionStatus === 'connecting' || isViewing) {
      addLog('Already connecting or connected to a stream');
      return;
    }

    try {
      setConnectionStatus('connecting');
      addLog(`Joining stream by ID: ${manualStreamId}`);
      
      setIsViewing(true);
      setViewingStreamId(manualStreamId);
      
      // Try to find existing stream in store or create placeholder
      let stream = activeStreams.find(s => s.id === manualStreamId);
      if (!stream) {
        // Create placeholder stream
        stream = {
          id: manualStreamId,
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
          category: 'Unknown'
        };
        addStream(stream);
      }
      
      // Actually call the WebRTC service to join the stream
      addLog('Initiating WebRTC connection...');
      await webrtcService.joinStream(manualStreamId);
      
    } catch (error) {
      console.error('Error joining stream:', error);
      setConnectionStatus('error');
      setIsViewing(false);
      setViewingStreamId(null);
      const errorMsg = (error instanceof Error) ? error.message : JSON.stringify(error);
      addLog(`Failed to join stream: ${errorMsg}`);
    }
  };

  const leaveStream = () => {
    addLog('Leaving stream...');
    if (webrtcService) {
      webrtcService.disconnect();
    }
    setIsViewing(false);
    setViewingStreamId(null);
    setConnectionStatus('disconnected');
    setManualStreamId(''); // Clear the manual input
    addLog('Left stream');
  };

  const handleStreamEnd = () => {
    setConnectionStatus('disconnected');
    setIsViewing(false);
    setViewingStreamId(null);
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
      className={`min-h-screen p-6 space-y-6 ${className || ''}`}
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <div className="backdrop-blur-xl rounded-2xl shadow-xl border border-gray-800 p-6" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Live Streams
          </h2>
          {isViewing && (
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/80 rounded-xl border border-gray-700">
              <div className={`w-2.5 h-2.5 rounded-full ${getStatusBadge()}`}></div>
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
          )}
        </div>

        {/* Manual Stream Join */}
        <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Join Stream by ID</h3>
          </div>
          <div className="flex space-x-3">
            <input
              type="text"
              className="flex-1 px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-white"
              placeholder="Enter stream ID to watch"
              value={manualStreamId}
              onChange={(e) => setManualStreamId(e.target.value)}
              disabled={isViewing}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  joinStreamById();
                }
              }}
            />
            <Button 
              onClick={joinStreamById}
              disabled={
                !manualStreamId.trim() ||
                connectionStatus === 'connecting' || 
                isViewing
              }
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              {connectionStatus === 'connecting' ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Joining...
                </div>
              ) : (
                'Join Stream'
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Enter a stream ID directly to join a stream that might not appear in the list below.
          </p>
        </div>

        {/* Currently Viewing Stream */}
        {viewingStream && isViewing && (
          <div className="mb-6 p-4 bg-emerald-900/30 border border-emerald-700/50 rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-800/50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-emerald-200">Now Watching: {viewingStream.title}</h3>
              </div>
              <Button 
                onClick={leaveStream} 
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
              >
                Leave Stream
              </Button>
            </div>
            
            <div className="border border-gray-700 rounded-xl overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
              {webrtcService ? (
                <StreamPlayer
                  stream={viewingStream}
                  mode="viewer"
                  webrtcService={webrtcService}
                  className="h-96"
                  onConnectionStatusChange={(status) => {
                    setConnectionStatus(status);
                    addLog(`Connection status: ${status}`);
                  }}
                />
              ) : (
                <div className="h-96 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin mx-auto mb-2"></div>
                    <p>Initializing WebRTC service...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                <span>{viewingStream.viewers} viewers</span>
              </div>
              <span>•</span>
              <span>Streamed by {viewingStream.creator.displayName}</span>
            </div>
          </div>
        )}

        {/* Active Streams Grid */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">
              Available Streams ({activeStreams.length})
            </h3>
          </div>
          
          {activeStreams.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </div>
              <p className="text-lg mb-2 text-gray-300">No live streams available</p>
              <p className="text-sm text-gray-500">Check back later or start your own stream!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeStreams.map((stream) => (
                <div 
                  key={stream.id} 
                  className="border border-gray-700 rounded-xl overflow-hidden hover:shadow-xl hover:border-gray-600 transition-all duration-200 bg-gray-800/30"
                >
                  <div className="aspect-video bg-gray-800 relative">
                    <img 
                      src={stream.thumbnail} 
                      alt={stream.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      LIVE
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      {stream.viewers}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h4 className="font-semibold text-lg mb-2 text-white line-clamp-2">
                      {stream.title}
                    </h4>
                    
                    <div className="flex items-center space-x-2 mb-3">
                      <img 
                        src={stream.creator.avatar} 
                        alt={stream.creator.displayName}
                        className="w-6 h-6 rounded-full border border-gray-600"
                      />
                      <span className="text-sm text-gray-300">
                        {stream.creator.displayName}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-lg border border-gray-600">
                        {stream.category}
                      </span>
                      
                      <Button 
                        onClick={() => joinStream(stream)}
                        size="sm"
                        disabled={
                          connectionStatus === 'connecting' || 
                          (isViewing && viewingStreamId === stream.id)
                        }
                        className={`${
                          isViewing && viewingStreamId === stream.id 
                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                        } text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50`}
                      >
                        {isViewing && viewingStreamId === stream.id ? (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            Watching
                          </div>
                        ) : connectionStatus === 'connecting' ? (
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                            Joining...
                          </div>
                        ) : (
                          'Watch'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connection Logs - only show when viewing */}
        {isViewing && (
          <div className="mt-6">
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
              className="rounded-xl p-4 h-32 overflow-y-auto border border-gray-700"
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
        )}
      </div>
    </div>
  );
};