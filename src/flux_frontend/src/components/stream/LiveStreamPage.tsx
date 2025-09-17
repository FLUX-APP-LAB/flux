import React from 'react';
import { LiveStreamDemo } from './LiveStreamDemo';
import { useWallet } from '../../hooks/useWallet';

export const LiveStreamPage: React.FC = () => {
  const { newAuthActor } = useWallet();
  
  if (!newAuthActor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flux-primary mx-auto mb-4"></div>
          <p className="text-flux-text-secondary">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  return <LiveStreamDemo actor={newAuthActor} />;
};