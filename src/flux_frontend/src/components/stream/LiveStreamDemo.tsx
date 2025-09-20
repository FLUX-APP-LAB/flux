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
          <h2 className="text-2xl font-bold">Live Streaming</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* User Authentication Check */}
        {!currentUser && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">Please authenticate to start streaming.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Streaming Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Broadcast Stream</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stream Title *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your stream title"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                disabled={isStreaming}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your stream"
                rows={3}
                value={streamDescription}
                onChange={(e) => setStreamDescription(e.target.value)}
                disabled={isStreaming}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={streamCategory}
                onChange={(e) => setStreamCategory(e.target.value)}
                disabled={isStreaming}
              >
                <option value="Gaming">Gaming</option>
                <option value="JustChatting">Just Chatting</option>
                <option value="Music">Music</option>
                <option value="Art">Art</option>
                <option value="Technology">Technology</option>
                <option value="Education">Education</option>
              </select>
            </div>
            
            <div className="space-x-2">
              {!isStreaming ? (
                <Button 
                  onClick={startStreaming} 
                  disabled={!streamTitle.trim() || !currentUser || connectionStatus === 'connecting'}
                >
                  {connectionStatus === 'connecting' ? 'Starting...' : 'Start Streaming'}
                </Button>
              ) : (
                <Button onClick={stopStreaming} variant="danger">
                  Stop Streaming
                </Button>
              )}
            </div>

            {currentStreamId && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm">
                  <strong>Stream ID:</strong> {currentStreamId}
                </p>
                <p className="text-sm mt-1">
                  <strong>Viewers:</strong> {viewerCount}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Share this ID with viewers to join your stream
                </p>
              </div>
            )}

            {/* Streamer Video Player */}
            {currentStream && isStreaming && (
              <div className="border rounded-lg overflow-hidden">
                <StreamPlayer
                  stream={currentStream}
                  mode="streamer"
                  webrtcService={webrtcService}
                  className="h-64"
                />
              </div>
            )}
            {/* Viewer Video Player */}
            {viewingStream && isViewing && (
              <div className="border rounded-lg overflow-hidden">
                <StreamPlayer
                  stream={viewingStream}
                  mode="viewer"
                  webrtcService={webrtcService}
                  className="h-64"
                  onConnectionStatusChange={(status) => {
                    setConnectionStatus(status);
                    addLog(`Connection status: ${status}`);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Connection Logs */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Connection Logs</h3>
            <Button onClick={clearLogs} size="sm" variant="ghost">
              Clear Logs
            </Button>
          </div>
          <div className="bg-black text-green-400 p-4 rounded-lg h-40 overflow-y-auto font-mono text-sm">
            {connectionLogs.length === 0 ? (
              <div className="text-gray-500">No activity yet...</div>
            ) : (
              connectionLogs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};