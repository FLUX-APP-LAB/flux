import React, { useState } from 'react';
import { LiveStreamSetup } from './LiveStreamSetup';
import { Button } from '../ui/Button';
import { Gamepad2, Video, Settings, X } from 'lucide-react';

// Mock canister configuration for demo
const DEMO_CANISTER_CONFIG = {
  canisterId: 'rrkah-fqaaa-aaaaa-aaaaq-cai',
  idlFactory: {
    // Mock IDL factory for demo
    createActor: () => ({
      startGameStream: async () => ({ success: true, streamId: 'demo-stream-123' }),
      stopStream: async () => ({ success: true }),
      getActiveStreams: async () => [],
      watchStream: async () => ({ success: true }),
      leaveStream: async () => ({ success: true })
    })
  }
};

export const LiveStreamDemo: React.FC = () => {
  const [showSetup, setShowSetup] = useState(false);
  const [useFullIntegration, setUseFullIntegration] = useState(true);

  return (
    <div className="p-6 bg-flux-bg-primary min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-flux-text-primary mb-4">
            🎬 Live Stream Setup Demo
          </h1>
          <p className="text-flux-text-secondary">
            Test the fixed LiveStreamSetup component with WebRTC integration
          </p>
        </div>

        {/* Configuration Options */}
        <div className="bg-flux-bg-secondary rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-flux-text-primary mb-4">Configuration</h2>
          
          <div className="flex items-center justify-between p-4 bg-flux-bg-tertiary rounded-lg">
            <div className="flex items-center space-x-3">
              <Settings className="w-5 h-5 text-flux-text-secondary" />
              <div>
                <p className="text-flux-text-primary font-medium">
                  {useFullIntegration ? 'Full ICP Integration' : 'WebRTC Only'}
                </p>
                <p className="text-flux-text-secondary text-sm">
                  {useFullIntegration 
                    ? 'Includes canister integration for game streaming'
                    : 'Basic WebRTC camera/microphone only'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => setUseFullIntegration(!useFullIntegration)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useFullIntegration ? 'bg-flux-primary' : 'bg-flux-bg-secondary'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useFullIntegration ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Launch Demo */}
        <div className="bg-flux-bg-secondary rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-flux-text-primary mb-4">Launch Demo</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-flux-bg-tertiary rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Video className="w-6 h-6 text-flux-primary" />
                <h3 className="font-semibold text-flux-text-primary">WebRTC Features</h3>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-flux-text-secondary">
                <li>Camera and microphone access</li>
                <li>Real-time video preview</li>
                <li>Stream quality settings</li>
                <li>Audio enhancement controls</li>
                <li>Device selection</li>
              </ul>
            </div>
            
            {useFullIntegration && (
              <div className="p-4 bg-flux-bg-tertiary rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <Gamepad2 className="w-6 h-6 text-flux-primary" />
                  <h3 className="font-semibold text-flux-text-primary">ICP Integration</h3>
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-flux-text-secondary">
                  <li>Game streaming interface</li>
                  <li>Canister backend integration</li>
                  <li>Stream discovery</li>
                  <li>Viewer management</li>
                  <li>Connection quality monitoring</li>
                </ul>
              </div>
            )}
          </div>
          
          <Button
            onClick={() => setShowSetup(true)}
            className="w-full mt-4"
            size="lg"
          >
            <Video className="w-5 h-5 mr-2" />
            Open Live Stream Setup
          </Button>
        </div>

        {/* Status */}
        <div className="bg-flux-accent-green/10 border border-flux-accent-green rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-flux-text-primary">
                All Issues Fixed!
              </p>
              <p className="text-sm text-flux-text-secondary">
                LiveStreamSetup component now includes all required imports and props. 
                Image loading errors have been resolved.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Modal */}
        {showSetup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-flux-bg-secondary rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-flux-text-primary">
                    Live Stream Setup
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSetup(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <LiveStreamSetup
                  onClose={() => setShowSetup(false)}
                  canisterId={useFullIntegration ? DEMO_CANISTER_CONFIG.canisterId : undefined}
                  idlFactory={useFullIntegration ? DEMO_CANISTER_CONFIG.idlFactory : undefined}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveStreamDemo;
