import React, { useState } from 'react';
import { WebRTCStream } from './WebRTCStream';

// Mock canister ID and IDL factory for demo purposes
const DEMO_CANISTER_ID = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
const DEMO_IDL_FACTORY = {
  // Mock IDL factory structure
  createActor: () => ({
    startGameStream: async () => ({ success: true, streamId: 'demo-stream-123' }),
    stopStream: async () => ({ success: true }),
    getActiveStreams: async () => [],
    watchStream: async () => ({ success: true }),
    leaveStream: async () => ({ success: true })
  })
};

export const StreamDemo: React.FC = () => {
  const [currentStreamId, setCurrentStreamId] = useState<string>('demo-stream-001');
  const [isStreamer, setIsStreamer] = useState<boolean>(true);
  const [mode, setMode] = useState<'viewer' | 'streamer'>('streamer');

  const handleStreamStart = (stream: MediaStream) => {
    console.log('Stream started:', stream);
    // Handle stream start - you could send this to your backend
  };

  const handleStreamEnd = () => {
    console.log('Stream ended');
    // Handle stream end cleanup
  };

  return (
    <div className="h-screen p-4 bg-flux-bg-primary">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-flux-text-primary mb-4">
            Flux Streaming Demo
          </h1>
          
          {/* Demo Controls */}
          <div className="flex items-center space-x-4 mb-4 p-4 bg-flux-bg-secondary rounded-lg">
            <div className="flex items-center space-x-2">
              <label className="text-flux-text-primary font-medium">Mode:</label>
              <button
                onClick={() => {
                  setMode('streamer');
                  setIsStreamer(true);
                }}
                className={`px-3 py-1 rounded ${
                  mode === 'streamer' 
                    ? 'bg-flux-primary text-white' 
                    : 'bg-flux-bg-tertiary text-flux-text-secondary'
                }`}
              >
                Streamer
              </button>
              <button
                onClick={() => {
                  setMode('viewer');
                  setIsStreamer(false);
                }}
                className={`px-3 py-1 rounded ${
                  mode === 'viewer' 
                    ? 'bg-flux-primary text-white' 
                    : 'bg-flux-bg-tertiary text-flux-text-secondary'
                }`}
              >
                Viewer
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-flux-text-primary font-medium">Stream ID:</label>
              <input
                type="text"
                value={currentStreamId}
                onChange={(e) => setCurrentStreamId(e.target.value)}
                className="px-3 py-1 bg-flux-bg-tertiary text-flux-text-primary rounded border border-flux-bg-quaternary"
                placeholder="Enter stream ID"
              />
            </div>
          </div>

          {/* Feature List */}
          <div className="mb-6 p-4 bg-flux-bg-secondary rounded-lg">
            <h2 className="text-xl font-semibold text-flux-text-primary mb-3">Features</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-flux-text-secondary">
              <div>
                <h3 className="font-medium text-flux-text-primary mb-2">WebRTC Mode:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Real-time webcam streaming</li>
                  <li>Audio/video controls</li>
                  <li>Quality settings (480p/720p/1080p)</li>
                  <li>Frame rate control</li>
                  <li>Audio enhancement (echo cancellation, noise suppression)</li>
                  <li>Device selection</li>
                  <li>Permission management</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-flux-text-primary mb-2">Game Streaming Mode:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Game streaming via StreamingInterface</li>
                  <li>ICP canister integration</li>
                  <li>Stream discovery</li>
                  <li>Viewer management</li>
                  <li>Stream statistics</li>
                  <li>Connection quality monitoring</li>
                  <li>Category-based streaming</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Stream Component */}
        <div className="bg-flux-bg-secondary rounded-lg overflow-hidden" style={{ height: '600px' }}>
          <WebRTCStream
            streamId={currentStreamId}
            isStreamer={isStreamer}
            mode={mode}
            canisterId={DEMO_CANISTER_ID}
            idlFactory={DEMO_IDL_FACTORY}
            onStreamStart={handleStreamStart}
            onStreamEnd={handleStreamEnd}
            className="h-full"
          />
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 p-4 bg-flux-bg-secondary rounded-lg">
          <h2 className="text-xl font-semibold text-flux-text-primary mb-3">Usage Instructions</h2>
          <div className="text-sm text-flux-text-secondary space-y-2">
            <p><strong>As a Streamer:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Toggle between "📹 WebRTC" for webcam streaming and "🎮 Game Stream" for game streaming</li>
              <li>Grant camera/microphone permissions when prompted</li>
              <li>Use settings panel to adjust quality, frame rate, and audio settings</li>
              <li>Control video/audio with the overlay buttons when streaming</li>
            </ul>
            <p><strong>As a Viewer:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Browse active streams in the StreamingInterface</li>
              <li>Click "📺 Watch" to join a stream</li>
              <li>View stream statistics and connection quality</li>
              <li>Use "❌ Leave Stream" to disconnect</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamDemo;
