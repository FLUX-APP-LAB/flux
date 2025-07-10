import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Wallet, User, LogOut } from 'lucide-react';

export const AuthTest: React.FC = () => {
  const { 
    isAuthenticated, 
    principal, 
    isLoading, 
    login, 
    logout, 
    getWalletAddress,
    actor 
  } = useAuth();

  return (
    <div className="p-6 bg-flux-bg-secondary rounded-xl max-w-md mx-auto">
      <h2 className="text-xl font-bold text-flux-text-primary mb-4">
        Authentication Test
      </h2>
      
      <div className="space-y-4">
        <div className="text-sm">
          <p className="text-flux-text-secondary">Status:</p>
          <p className={`font-semibold ${isAuthenticated ? 'text-flux-accent-green' : 'text-flux-accent-red'}`}>
            {isAuthenticated ? 'Connected' : 'Disconnected'}
          </p>
        </div>
        
        {isAuthenticated && principal && (
          <>
            <div className="text-sm">
              <p className="text-flux-text-secondary">Principal:</p>
              <p className="font-mono text-xs text-flux-text-primary break-all">
                {principal}
              </p>
            </div>
            
            <div className="text-sm">
              <p className="text-flux-text-secondary">Wallet Address:</p>
              <p className="font-mono text-xs text-flux-text-primary break-all">
                {getWalletAddress()}
              </p>
            </div>
            
            <div className="text-sm">
              <p className="text-flux-text-secondary">Actor Available:</p>
              <p className={`font-semibold ${actor ? 'text-flux-accent-green' : 'text-flux-accent-red'}`}>
                {actor ? 'Yes' : 'No'}
              </p>
            </div>
          </>
        )}
        
        <div className="flex space-x-2">
          {!isAuthenticated ? (
            <Button
              onClick={login}
              isLoading={isLoading}
              className="flex-1 bg-flux-gradient hover:opacity-90 text-white"
            >
              <Wallet className="w-4 h-4 mr-2" />
              {isLoading ? 'Connecting...' : 'Connect'}
            </Button>
          ) : (
            <Button
              onClick={logout}
              variant="secondary"
              className="flex-1"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthTest;
