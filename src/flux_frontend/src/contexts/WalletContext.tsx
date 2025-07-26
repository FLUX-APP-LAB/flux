import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthClient } from "@dfinity/auth-client";
import { Principal } from "@dfinity/principal";
import { idlFactory } from '../../../declarations/flux_backend/flux_backend.did.js';
import { Actor, HttpAgent } from '@dfinity/agent';
import { useAppStore } from '../store/appStore';

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
  getUser: (principal: string) => Promise<any>;
  fetchAndSetCurrentUser: (principal: string) => Promise<any>;
  refreshCurrentUser: () => Promise<any>;
  purchaseBits: (amount: number) => Promise<boolean>;
  sendGift: (recipient: string, giftType: string, amount: number) => Promise<boolean>;
  cheerWithBits: (streamer: string, amount: number) => Promise<boolean>;
  requestPayout: (amount: number) => Promise<string | null>;
  formatWalletAddress: (address?: string) => string;
  disconnectWallet: () => Promise<void>;
  updateProfile: (data: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    banner?: string;
    socialLinks?: {
      discord?: string;
      instagram?: string;
      twitter?: string;
      website?: string;
      youtube?: string;
    };
  }) => Promise<any>;
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
    : `http://${import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY || 'uzt4z-lp777-77774-qaabq-cai'}.localhost:4943`;

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

  const { setCurrentUser } = useAppStore();

  // Helper to fetch and set current user in store
  const fetchAndSetCurrentUser = async (userPrincipal: string) => {
    const user = await getUser(userPrincipal);
    if (user) setCurrentUser(user);
    return user;
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
      
      if (isLocal) {
        try {
          console.log('Fetching root key for local development...');
          await agent.fetchRootKey();
          console.log('Root key fetched successfully');
        } catch (error) {
          console.error('Failed to fetch root key:', error);
        }
      }

      const canisterId = import.meta.env.VITE_CANISTER_ID_FLUX_BACKEND || 'uxrrr-q7777-77774-qaaaq-cai';
      
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

      // Fetch and set user profile in global store
      if (typeof fetchAndSetCurrentUser === 'function') {
        try {
          await fetchAndSetCurrentUser(principalIdFull);
        } catch (e) {
          console.error('Failed to fetch user profile after authentication:', e);
        }
      }
    } catch (error) {
      console.error('Error in handleAuthenticated:', error);
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
      console.log('Starting login process...');
      await authClient.login({
        ...defaultOptions.loginOptions,
        onSuccess: async () => {
          try {
            console.log('Login successful, handling authentication...');
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

  const getUser = async (userPrincipal: string) => {
    if (!newAuthActor) {
      console.error('Actor not initialized');
      return null;
    }
    
    if (!userPrincipal || userPrincipal.trim() === '') {
      console.error('Invalid principal: empty or null');
      return null;
    }
    
    try {
      console.log('Fetching user with principal:', userPrincipal);
      
      let principalObj;
      try {
        principalObj = Principal.fromText(userPrincipal);
      } catch (principalError) {
        console.error('Invalid principal format:', userPrincipal, principalError);
        return null;
      }
      
      const result = await newAuthActor.getUser(principalObj);
      
      if ('ok' in result) {
        console.log('User found:', result.ok);
        const backendUser = result.ok;
        
        let avatarUrl = '/default-avatar.png';
        if (backendUser.avatar && backendUser.avatar.length > 0 && backendUser.avatar[0]) {
          const base64Avatar = backendUser.avatar[0];
          if (base64Avatar && typeof base64Avatar === 'string') {
            if (base64Avatar.startsWith('data:image/')) {
              avatarUrl = base64Avatar;
            } else {
              avatarUrl = `data:image/jpeg;base64,${base64Avatar}`;
            }
            console.log('Avatar loaded from base64:', avatarUrl.substring(0, 50) + '...');
          }
        }

        let bannerUrl;
        if (backendUser.banner && backendUser.banner.length > 0 && backendUser.banner[0]) {
          const base64Banner = backendUser.banner[0];
          if (base64Banner && typeof base64Banner === 'string') {
            if (base64Banner.startsWith('data:image/')) {
              bannerUrl = base64Banner;
            } else {
              bannerUrl = `data:image/jpeg;base64,${base64Banner}`;
            }
            console.log('Banner loaded from base64');
          }
        }

        const frontendUser = {
          id: backendUser.id.toString(),
          username: backendUser.username,
          displayName: backendUser.displayName,
          avatar: avatarUrl,
          followerCount: backendUser.followers?.length || 0,
          followingCount: backendUser.following?.length || 0,
          subscriberCount: backendUser.subscribers?.length || 0,
          isLiveStreaming: false, 
          tier: backendUser.tier?.Partner ? 'platinum' : 
                backendUser.tier?.Creator ? 'gold' : 
                backendUser.tier?.Premium ? 'silver' : 'bronze' as 'bronze' | 'silver' | 'gold' | 'platinum',
          banner: bannerUrl,
          walletAddress: userPrincipal,
          principal: userPrincipal,
          bio: Array.isArray(backendUser.bio) ? backendUser.bio[0] || '' : backendUser.bio || '',
          location: backendUser.location?.[0] || '',
          website: Array.isArray(backendUser.socialLinks?.website)
            ? backendUser.socialLinks.website.filter(Boolean)
            : backendUser.socialLinks?.website
              ? [backendUser.socialLinks.website]
              : [],
        };
        
        console.log('Frontend user object created:', {
          username: frontendUser.username,
          displayName: frontendUser.displayName,
          avatar: frontendUser.avatar
        });
        
        return frontendUser;
      } else {
        console.log('User not found:', result.err);
        return null;
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
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

  const refreshCurrentUser = async () => {
    if (!principal || !newAuthActor) {
      console.log('Cannot refresh user: missing principal or actor');
      return null;
    }

    try {
      const userData = await getUser(principal);
      if (userData) {
        console.log('Current user refreshed:', {
          username: userData.username,
          hasAvatar: !!userData.avatar,
          avatarPreview: userData.avatar ? userData.avatar.substring(0, 50) + '...' : 'none'
        });
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing current user:', error);
      return null;
    }
  };

  const updateProfile = async ({ displayName, bio, avatar, banner, socialLinks }: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    banner?: string;
    socialLinks?: {
      discord?: string;
      instagram?: string;
      twitter?: string;
      website?: string;
      youtube?: string;
    };
  }) => {
    if (!newAuthActor) {
      console.error('Actor not initialized');
      return null;
    }
    try {
      // Convert empty strings to undefined for optional candid fields
      const opt = (val: any) => (val ? [val] : []);
      const optLinks = (links: any) => {
        if (!links) return [];
        return [{
          discord: links.discord ? [links.discord] : [],
          instagram: links.instagram ? [links.instagram] : [],
          twitter: links.twitter ? [links.twitter] : [],
          website: links.website ? [links.website] : [],
          youtube: links.youtube ? [links.youtube] : [],
        }];
      };
      const result = await newAuthActor.updateProfile(
        opt(displayName),
        opt(bio),
        opt(avatar),
        opt(banner),
        optLinks(socialLinks)
      );
      if ('ok' in result) {
        console.log('Profile updated:', result.ok);
        return result.ok;
      } else {
        console.error('Profile update error:', result.err);
        return null;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      return null;
    }
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
    getUser,
    fetchAndSetCurrentUser,
    purchaseBits,
    sendGift,
    cheerWithBits,
    requestPayout,
    formatWalletAddress,
    disconnectWallet,
    refreshCurrentUser,
    updateProfile,
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
