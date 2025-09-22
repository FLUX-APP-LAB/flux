import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthClient } from "@dfinity/auth-client";
import { Principal } from "@dfinity/principal";
import { Identity } from "@dfinity/agent";
import { idlFactory } from '../../../declarations/flux_backend/flux_backend.did.js';
import { Actor, HttpAgent } from '@dfinity/agent';
import { useAppStore } from '../store/appStore';
import { authUtils } from '../lib/authUtils';

interface WalletContextType {
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  principal: string;
  newAuthActor: any;
  identity: Identity | null;
  // Additional wallet properties for compatibility
  walletAddress: string | null;
  isConnected: boolean;
  balance: any;
  isLoadingBalance: boolean;
  transactions: any[];
  isLoadingTransactions: boolean;
  isInitializing: boolean;
  authError: string | null;
  getBalance: () => Promise<any>;
  getTransactionHistory: () => Promise<any[]>;
  getUser: (principal: string) => Promise<any>;
  fetchAndSetCurrentUser: (principal: string) => Promise<any>;
  refreshCurrentUser: () => Promise<any>;
  refreshIdentity: () => Promise<boolean>;
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
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [newAuthActor, setAuthActor] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const days = BigInt(1);
  const hours = BigInt(24);
  const nanoSeconds = BigInt(3600000000000);

  const network = import.meta.env.DFX_NETWORK || import.meta.env.VITE_DFX_NETWORK || 'local';
  
  // Check if we're on IC mainnet first (more specific check)
  const isMainnet = window.location.hostname.includes('.icp0.io') || 
    window.location.hostname.includes('.ic0.app') ||
    network === 'ic';
  
  // Only consider it local if explicitly local network AND localhost hostname
  const isLocal = !isMainnet && (
    (network === 'local' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('.localhost')
    ))
  );
  
  const identityProvider = isMainnet || (!isLocal && network !== 'local')
    ? 'https://identity.ic0.app' 
    : `http://${import.meta.env.CANISTER_ID_INTERNET_IDENTITY || import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY || 'uzt4z-lp777-77774-qaabq-cai'}.localhost:4943`;

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

  const { setCurrentUser, setAuthenticated, setWalletAddress, setPrincipal: setAppPrincipal } = useAppStore();

  // Helper to fetch and set current user in store
  const fetchAndSetCurrentUser = async (userPrincipal: string) => {
    const user = await getUser(userPrincipal);
    if (user) await setCurrentUser(user);
    return user;
  };

  // Sync authentication state with app store
  useEffect(() => {
    setAuthenticated(isAuthenticated);
    setWalletAddress(isAuthenticated ? principal : null);
    setAppPrincipal(isAuthenticated ? principal : null);
  }, [isAuthenticated, principal, setAuthenticated, setWalletAddress, setAppPrincipal]);

  // Periodic identity refresh to ensure validity
  useEffect(() => {
    if (!isAuthenticated || !authClient) return;

    const refreshInterval = setInterval(async () => {
      try {
        const isStillAuth = await authClient.isAuthenticated();
        if (!isStillAuth) {
          console.log('Identity expired, logging out');
          await logout();
          return;
        }
        
        // Refresh identity to ensure it's still valid
        await refreshIdentity();
      } catch (error) {
        console.error('Error during periodic identity check:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, authClient]);

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    try {
      console.log('Initializing authentication...');
      
      // Check saved auth state first
      const savedAuthState = authUtils.getAuthState();
      console.log('Saved auth state:', savedAuthState);
      
      const client = await AuthClient.create(defaultOptions.createOptions);
      setAuthClient(client);
      
      // Check if user is authenticated
      const isAuthenticated = await client.isAuthenticated();
      console.log('Authentication status:', isAuthenticated);
      
      if (isAuthenticated) {
        // Validate existing identity before proceeding
        const existingIdentity = await client.getIdentity();
        if (validateIdentity(existingIdentity)) {
          console.log('Restoring authenticated session...');
          await handleAuthenticated(client);
        } else {
          console.warn('Existing identity is invalid, clearing auth state');
          await client.logout();
          authUtils.clearAuthState();
        }
      } else {
        // If we have saved state but no active session, clear it
        if (savedAuthState?.hasValidSession) {
          console.log('Clearing stale auth state');
          authUtils.clearAuthState();
        }
      }
    } catch (error) {
      console.error("Authentication initialization error:", error);
      setAuthError(error instanceof Error ? error.message : 'Authentication initialization failed');
    } finally {
      setIsInitializing(false);
    }
  }

  // Helper function to validate identity
  const validateIdentity = (identity: Identity): boolean => {
    try {
      if (!identity) {
        console.error('Identity is null or undefined');
        return false;
      }
      
      const principal = identity.getPrincipal();
      if (!principal) {
        console.error('Failed to get principal from identity');
        return false;
      }
      
      const principalText = principal.toString();
      if (!principalText || principalText.length === 0) {
        console.error('Principal is empty');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error validating identity:', error);
      return false;
    }
  };

  async function handleAuthenticated(client: AuthClient) {
    try {
      const identity = await client.getIdentity();
      console.log('Retrieved identity:', identity);
      
      // Validate identity before proceeding
      if (!validateIdentity(identity)) {
        throw new Error('Invalid identity received from authentication');
      }
      
      setIdentity(identity);
      setIsAuthenticated(true);

      const principal = identity.getPrincipal();
      const principalIdFull = principal.toString();
      setPrincipal(principalIdFull);
      
      console.log('Authentication successful for principal:', principalIdFull);
      
      // Save auth state to localStorage
      authUtils.saveAuthState(true, principalIdFull);

      console.log('Creating HttpAgent...', {
        isLocal,
        isMainnet,
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

      // Get the correct canister ID based on environment
      let canisterId;
      if (isMainnet || (!isLocal && network !== 'local')) {
        // Use mainnet canister ID - try multiple environment variable sources
        canisterId = import.meta.env.CANISTER_ID_FLUX_BACKEND || 
                    import.meta.env.VITE_CANISTER_ID_FLUX_BACKEND || 
                    'rhgnb-siaaa-aaaau-abyla-cai'; // Hardcoded mainnet canister ID as final fallback
      } else {
        // Use local development canister ID
        canisterId = import.meta.env.CANISTER_ID_FLUX_BACKEND || 
                    import.meta.env.VITE_CANISTER_ID_FLUX_BACKEND || 
                    'vpyes-67777-77774-qaaeq-cai'; // Local development fallback
      }
      
      console.log('Creating actor with:', {
        canisterId,
        agentHost: agent.host,
        identityPrincipal: principal.toString(),
        isMainnet,
        isLocal,
        network,
        envVars: {
          CANISTER_ID_FLUX_BACKEND: import.meta.env.CANISTER_ID_FLUX_BACKEND,
          VITE_CANISTER_ID_FLUX_BACKEND: import.meta.env.VITE_CANISTER_ID_FLUX_BACKEND
        }
      });

      const newAuthActor = Actor.createActor(idlFactory, {
        agent,
        canisterId,
      });
      console.log('newAuthActor created successfully');
      setAuthActor(newAuthActor);

      // Fetch user profile using the freshly created actor to avoid state update race
      try {
        let principalObj;
        try {
          principalObj = Principal.fromText(principalIdFull);
        } catch (principalError) {
          console.error('Invalid principal format when fetching current user:', principalIdFull, principalError);
          principalObj = null;
        }

        if (principalObj) {
          const result = await Promise.race([
            newAuthActor.getUser(principalObj),
            new Promise((_, reject) => setTimeout(() => reject(new Error('User lookup timeout')), 10000))
          ]);

          const raceResult: any = result as any;
          if (raceResult && 'ok' in raceResult) {
            const backendUser: any = raceResult.ok;

            let avatarUrl = '/default-avatar.png';
            if (backendUser.avatar && backendUser.avatar.length > 0 && backendUser.avatar[0]) {
              const base64Avatar = backendUser.avatar[0];
              if (base64Avatar && typeof base64Avatar === 'string') {
                avatarUrl = base64Avatar.startsWith('data:image/')
                  ? base64Avatar
                  : `data:image/jpeg;base64,${base64Avatar}`;
              }
            }

            let bannerUrl;
            if (backendUser.banner && backendUser.banner.length > 0 && backendUser.banner[0]) {
              const base64Banner = backendUser.banner[0];
              if (base64Banner && typeof base64Banner === 'string') {
                bannerUrl = base64Banner.startsWith('data:image/')
                  ? base64Banner
                  : `data:image/jpeg;base64,${base64Banner}`;
              }
            }

            const frontendUser = {
              id: backendUser.id.toString(),
              username: backendUser.username,
              displayName: backendUser.displayName,
              avatar: avatarUrl,
              followerCount: Number(backendUser.followers?.length || 0),
              followingCount: Number(backendUser.following?.length || 0),
              subscriberCount: Number(backendUser.subscribers?.length || 0),
              isLiveStreaming: false,
              tier: backendUser.tier?.Partner ? 'platinum' : 
                    backendUser.tier?.Creator ? 'gold' : 
                    backendUser.tier?.Premium ? 'silver' : 'bronze' as 'bronze' | 'silver' | 'gold' | 'platinum',
              banner: bannerUrl,
              walletAddress: principalIdFull,
              principal: principalIdFull,
              bio: Array.isArray(backendUser.bio) ? backendUser.bio[0] || '' : backendUser.bio || '',
              location: backendUser.location?.[0] || '',
              website: Array.isArray(backendUser.socialLinks?.website)
                ? backendUser.socialLinks.website.filter(Boolean)
                : backendUser.socialLinks?.website
                  ? [backendUser.socialLinks.website]
                  : [],
            };

            await setCurrentUser(frontendUser);
          } else {
            // No existing user; keep currentUser null to trigger signup in App
            console.log('No existing user profile found for principal:', principalIdFull);
            await setCurrentUser(null);
          }
        }
      } catch (e) {
        console.error('Failed to fetch user profile after authentication (direct actor):', e);
      }
      
      // Set initializing to false after authentication is complete
      setIsInitializing(false);
    } catch (error) {
      console.error('Error in handleAuthenticated:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      setIsAuthenticated(false);
      setIdentity(null);
      setIsInitializing(false);
      setAuthActor(null);
      setPrincipal("");
      // Clear saved auth state on error
      authUtils.clearAuthState();
    }
  }

  async function login() {
    if (!authClient) {
      console.error('AuthClient not initialized');
      setAuthError('Authentication client not initialized');
      return;
    }
    
    try {
      setAuthError(null);
      console.log('Starting login process...');
      
      return new Promise<void>((resolve, reject) => {
        authClient!.login({
          ...defaultOptions.loginOptions,
          onSuccess: async () => {
            try {
              console.log('Login successful, handling authentication...');
              await handleAuthenticated(authClient!);
              resolve();
            } catch (error) {
              console.error('Error handling authentication:', error);
              setAuthError(error instanceof Error ? error.message : 'Authentication failed');
              reject(error);
            }
          },
          onError: (error: unknown) => {
            console.error('Login failed:', error);
            setAuthError(error instanceof Error ? error.message : 'Login failed');
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Error during login:', error);
      setAuthError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    }
  }

  // Function to refresh identity from auth client
  const refreshIdentity = async (): Promise<boolean> => {
    if (!authClient) {
      console.error('AuthClient not available for identity refresh');
      return false;
    }
    
    try {
      const isAuth = await authClient.isAuthenticated();
      if (!isAuth) {
        console.log('User is not authenticated, cannot refresh identity');
        return false;
      }
      
      const newIdentity = await authClient.getIdentity();
      if (!validateIdentity(newIdentity)) {
        console.error('Refreshed identity is invalid');
        return false;
      }
      
      setIdentity(newIdentity);
      const principal = newIdentity.getPrincipal();
      const principalIdFull = principal.toString();
      setPrincipal(principalIdFull);
      
      console.log('Identity refreshed successfully for principal:', principalIdFull);
      return true;
    } catch (error) {
      console.error('Error refreshing identity:', error);
      setAuthError(error instanceof Error ? error.message : 'Identity refresh failed');
      return false;
    }
  };

  async function logout() {
    if (!authClient) return;
    
    try {
      await authClient.logout();
      
      // Clear all identity-related state
      setIdentity(null);
      setAuthActor(null);
      setIsAuthenticated(false);
      setPrincipal("");
      setBalance(null);
      setTransactions([]);
      setAuthError(null);
      
      // Clear saved auth state
      authUtils.clearAuthState();
      
      // Clear app store state
      await setCurrentUser(null);
      setAuthenticated(false);
      setWalletAddress(null);
      setAppPrincipal(null);
      
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      setAuthError(error instanceof Error ? error.message : 'Logout failed');
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
      console.error('Actor not initialized - cannot fetch user');
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
      
      // Add timeout to prevent hanging
      const result = await Promise.race([
        newAuthActor.getUser(principalObj),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User lookup timeout')), 10000)
        )
      ]);
      
      if ('ok' in result) {
        console.log('User found successfully:', {
          username: result.ok.username,
          displayName: result.ok.displayName,
          principal: userPrincipal
        });
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
          followerCount: Number(backendUser.followers?.length || 0), // Convert to number
          followingCount: Number(backendUser.following?.length || 0), // Convert to number
          subscriberCount: Number(backendUser.subscribers?.length || 0), // Convert to number
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
        console.log('User not found in backend:', {
          principal: userPrincipal,
          error: result.err
        });
        return null;
      }
    } catch (error) {
      console.error('Error fetching user from backend:', {
        principal: userPrincipal,
        error: error instanceof Error ? error.message : error
      });
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
    isInitializing,
    authError,
    getBalance,
    getTransactionHistory,
    getUser,
    fetchAndSetCurrentUser,
    refreshCurrentUser,
    refreshIdentity,
    purchaseBits,
    sendGift,
    cheerWithBits,
    requestPayout,
    formatWalletAddress,
    disconnectWallet,
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
