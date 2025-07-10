import { useState, useEffect, useCallback } from 'react';
import { getAuthClient, AuthState, FluxAuthClient } from '../lib/authClient';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    actor: null,
    authClient: null,
    isAuthenticated: false,
    principal: '',
    identity: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [authClient, setAuthClient] = useState<FluxAuthClient | null>(null);

  useEffect(() => {
    const client = getAuthClient((state) => {
      setAuthState(state);
      setIsLoading(false);
    });
    setAuthClient(client);

    // Initialize and get current state
    const initAuth = async () => {
      const currentState = await client.getState();
      if (currentState) {
        setAuthState(currentState);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (): Promise<boolean> => {
    if (!authClient) return false;
    setIsLoading(true);
    try {
      const success = await authClient.login();
      return success;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authClient]);

  const logout = useCallback(async (): Promise<void> => {
    if (!authClient) return;
    setIsLoading(true);
    try {
      await authClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authClient]);

  const getWalletAddress = useCallback((): string | null => {
    return authClient?.getWalletAddress() || null;
  }, [authClient]);

  return {
    ...authState,
    isLoading,
    login,
    logout,
    getWalletAddress,
    authClient
  };
};

export default useAuth;
