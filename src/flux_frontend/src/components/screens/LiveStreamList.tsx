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
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
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

  return (
    <div className={`p-6 space-y-6 ${className || ''}`}>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Live Streams</h2>
          {isViewing && (
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
          )}
        </div>

        {/* Manual Stream Join */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Join Stream by ID</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            >
              {connectionStatus === 'connecting' ? 'Joining...' : 'Join Stream'}
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Enter a stream ID directly to join a stream that might not appear in the list below.
          </p>
        </div>

        {/* Currently Viewing Stream */}
        {viewingStream && isViewing && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Now Watching: {viewingStream.title}</h3>
              <Button onClick={leaveStream} variant="danger" size="sm">
                Leave Stream
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden bg-black">
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
                <div className="h-96 flex items-center justify-center text-white">
                  <p>Initializing WebRTC service...</p>
                </div>
              )}
            </div>

            <div className="mt-2 text-sm text-gray-600">
              {viewingStream.viewers} viewers • Streamed by {viewingStream.creator.displayName}
            </div>
          </div>
        )}

        {/* Active Streams Grid */}
        <div>
          <h3 className="text-xl font-semibold mb-4">
            Available Streams ({activeStreams.length})
          </h3>
          
          {activeStreams.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No live streams available</p>
              <p className="text-sm">Check back later or start your own stream!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeStreams.map((stream) => (
                <div 
                  key={stream.id} 
                  className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-gray-200 relative">
                    <img 
                      src={stream.thumbnail} 
                      alt={stream.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                      LIVE
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                      {stream.viewers} viewers
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h4 className="font-semibold text-lg mb-2 line-clamp-2">
                      {stream.title}
                    </h4>
                    
                    <div className="flex items-center space-x-2 mb-3">
                      <img 
                        src={stream.creator.avatar} 
                        alt={stream.creator.displayName}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm text-gray-600">
                        {stream.creator.displayName}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {stream.category}
                      </span>
                      
                      <Button 
                        onClick={() => joinStream(stream)}
                        size="sm"
                        disabled={
                          connectionStatus === 'connecting' || 
                          (isViewing && viewingStreamId === stream.id)
                        }
                      >
                        {isViewing && viewingStreamId === stream.id ? 'Watching' : 
                         connectionStatus === 'connecting' ? 'Joining...' : 'Watch'}
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
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Connection Logs</h3>
              <Button onClick={clearLogs} size="sm" variant="ghost">
                Clear Logs
              </Button>
            </div>
            <div className="bg-black text-green-400 p-4 rounded-lg h-32 overflow-y-auto font-mono text-sm">
              {connectionLogs.length === 0 ? (
                <div className="text-gray-500">No activity yet...</div>
              ) : (
                connectionLogs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};