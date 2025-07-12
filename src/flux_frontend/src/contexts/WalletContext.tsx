import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthClient } from "@dfinity/auth-client";
import { idlFactory } from '../../../declarations/flux_backend/flux_backend.did.js';
import { Actor, HttpAgent } from '@dfinity/agent';

interface WalletContextType {
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  principal: string;
  newAuthActor: any;
  identity: any;
  // Additional wallet properties for compatibility
  walletAddress: string | null;
  isConnected: boolean;
  balance: any;
  isLoadingBalance: boolean;
  transactions: any[];
  isLoadingTransactions: boolean;
  getBalance: () => Promise<any>;
  getTransactionHistory: () => Promise<any[]>;
  purchaseBits: (amount: number) => Promise<boolean>;
  sendGift: (recipient: string, giftType: string, amount: number) => Promise<boolean>;
  cheerWithBits: (streamer: string, amount: number) => Promise<boolean>;
  requestPayout: (amount: number) => Promise<string | null>;
  formatWalletAddress: (address?: string) => string;
  disconnectWallet: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextType | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState("");
  const [identity, setIdentity] = useState<any>(null);
  const [newAuthActor, setAuthActor] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  
  const days = BigInt(1);
  const hours = BigInt(24);
  const nanoSeconds = BigInt(3600000000000);

  const network = import.meta.env.VITE_DFX_NETWORK || 'local';
  const isLocal = network === 'local' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  const identityProvider = !isLocal
    ? 'https://identity.ic0.app' 
    : `http://${import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY || 'vb2j2-fp777-77774-qaafq-cai'}.localhost:4943`;

  const defaultOptions = {
    createOptions: {
      idleOptions: {
        disableIdle: true,
      },
    },
    loginOptions: {
      identityProvider,
      maxTimeToLive: days * hours * nanoSeconds,
    },
  };

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    try {
      console.log('Initializing AuthClient...', { 
        isLocal, 
        identityProvider,
        network 
      });
      
      const client = await AuthClient.create(defaultOptions.createOptions);
      setAuthClient(client);
      
      const isAuthenticated = await client.isAuthenticated();
      console.log('Authentication status:', isAuthenticated);
      
      if (isAuthenticated) {
        await handleAuthenticated(client);
      }
    } catch (error) {
      console.error("Authentication initialization error:", error);
    }
  }

  async function handleAuthenticated(client: AuthClient) {
    try {
      const identity = await client.getIdentity();
      console.log('identity :>> ', identity);
      setIdentity(identity);
      setIsAuthenticated(true);

      const principal = identity.getPrincipal();
      const principalIdFull = principal.toString();
      setPrincipal(principalIdFull);

      console.log('Creating HttpAgent...', {
        isLocal,
        host: isLocal ? 'http://localhost:4943' : 'https://ic0.app'
      });

      const agent = new HttpAgent({ 
        identity,
        host: isLocal ? 'http://localhost:4943' : 'https://ic0.app'
      });
      
      // Fetch root key for local development
      if (isLocal) {
        try {
          console.log('Fetching root key for local development...');
          await agent.fetchRootKey();
          console.log('Root key fetched successfully');
        } catch (error) {
          console.error('Failed to fetch root key:', error);
          // Don't fail the whole authentication process if root key fetch fails
        }
      }

      const canisterId = import.meta.env.VITE_CANISTER_ID_FLUX_BACKEND || 'vpyes-67777-77774-qaaeq-cai';
      
      console.log('Creating actor with:', {
        canisterId,
        agentHost: agent.host,
        identityPrincipal: principal.toString()
      });

      const newAuthActor = Actor.createActor(idlFactory, {
        agent,
        canisterId,
      });
      console.log('newAuthActor created successfully');
      setAuthActor(newAuthActor);
    } catch (error) {
      console.error('Error in handleAuthenticated:', error);
      // Reset authentication state on error
      setIsAuthenticated(false);
      setIdentity(null);
      setAuthActor(null);
      setPrincipal("");
    }
  }

  async function login() {
    if (!authClient) {
      console.error('AuthClient not initialized');
      return;
    }
    
    try {
      await authClient.login({
        ...defaultOptions.loginOptions,
        onSuccess: async () => {
          try {
            await handleAuthenticated(authClient);
          } catch (error) {
            console.error('Error handling authentication:', error);
          }
        },
        onError: (error) => {
          console.error('Login failed:', error);
        }
      });
    } catch (error) {
      console.error('Error during login:', error);
    }
  }

  async function logout() {
    if (!authClient) return;
    
    try {
      await authClient.logout();
      setIdentity(null);
      setAuthActor(null);
      setIsAuthenticated(false);
      setPrincipal("");
      setBalance(null);
      setTransactions([]);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  // Mock wallet functions for compatibility
  const getBalance = async () => {
    if (!newAuthActor) return null;
    setIsLoadingBalance(true);
    try {
      // Mock balance for now
      const mockBalance = {
        appCoinBalance: 1500,
        bitsBalance: 750,
        lockedBalance: 200,
        lastUpdated: Date.now()
      };
      setBalance(mockBalance);
      return mockBalance;
    } catch (error) {
      console.error('Error getting balance:', error);
      return null;
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const getTransactionHistory = async () => {
    if (!newAuthActor) return [];
    setIsLoadingTransactions(true);
    try {
      // Mock transactions for now
      const mockTransactions = [
        {
          id: '1',
          from: 'System',
          to: principal,
          amount: 100,
          type: 'Coins',
          description: 'Welcome bonus',
          timestamp: Date.now() - 86400000
        }
      ];
      setTransactions(mockTransactions);
      return mockTransactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const purchaseBits = async (amount: number) => {
    if (!newAuthActor) return false;
    try {
      // Mock implementation
      console.log('Purchasing bits:', amount);
      return true;
    } catch (error) {
      console.error('Error purchasing bits:', error);
      return false;
    }
  };

  const sendGift = async (recipient: string, giftType: string, amount: number) => {
    if (!newAuthActor) return false;
    try {
      // Mock implementation
      console.log('Sending gift:', { recipient, giftType, amount });
      return true;
    } catch (error) {
      console.error('Error sending gift:', error);
      return false;
    }
  };

  const cheerWithBits = async (streamer: string, amount: number) => {
    if (!newAuthActor) return false;
    try {
      // Mock implementation
      console.log('Cheering with bits:', { streamer, amount });
      return true;
    } catch (error) {
      console.error('Error cheering with bits:', error);
      return false;
    }
  };

  const requestPayout = async (amount: number) => {
    if (!newAuthActor) return null;
    try {
      // Mock implementation
      console.log('Requesting payout:', amount);
      return 'mock-transaction-id';
    } catch (error) {
      console.error('Error requesting payout:', error);
      return null;
    }
  };

  const formatWalletAddress = (address?: string) => {
    const addr = address || principal;
    if (!addr) return 'Not connected';
    if (addr.length <= 8) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const disconnectWallet = async () => {
    await logout();
  };

  const contextValue: WalletContextType = {
    isAuthenticated,
    login,
    logout,
    principal,
    newAuthActor,
    identity,
    walletAddress: principal,
    isConnected: isAuthenticated,
    balance,
    isLoadingBalance,
    transactions,
    isLoadingTransactions,
    getBalance,
    getTransactionHistory,
    purchaseBits,
    sendGift,
    cheerWithBits,
    requestPayout,
    formatWalletAddress,
    disconnectWallet
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
