import { AuthClient } from '@dfinity/auth-client';
import { createActor } from '../../../declarations/flux_backend';
import { canisterId } from '../../../declarations/flux_backend/index.js';

const network = import.meta.env.VITE_DFX_NETWORK || 'local';
const identityProvider =
  network === 'ic'
    ? 'https://identity.ic0.app' // Mainnet
    : `http://${import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY || 'uzt4z-lp777-77774-qaabq-cai'}.localhost:4943`; // Local

export interface AuthState {
  actor: any;
  authClient: AuthClient | null;
  isAuthenticated: boolean;
  principal: string;
  identity: any;
}

export class FluxAuthClient {
  private authClient: AuthClient | null = null;
  private actor: any = null;
  private onStateChange?: (state: AuthState) => void;

  constructor(onStateChange?: (state: AuthState) => void) {
    this.onStateChange = onStateChange;
    this.init();
  }

  // Initialize auth client
  async init(): Promise<void> {
    try {
      this.authClient = await AuthClient.create();
      await this.updateActor();
    } catch (error) {
      console.error('Failed to initialize auth client:', error);
    }
  }

  // Update actor with current identity
  private async updateActor(): Promise<void> {
    if (!this.authClient) return;

    const identity = this.authClient.getIdentity();
    this.actor = createActor(canisterId, {
      agentOptions: {
        identity
      }
    });

    const isAuthenticated = await this.authClient.isAuthenticated();
    const principal = identity.getPrincipal().toString();

    const state: AuthState = {
      actor: this.actor,
      authClient: this.authClient,
      isAuthenticated,
      principal,
      identity
    };

    this.onStateChange?.(state);
  }

  // Login with Internet Identity
  async login(): Promise<boolean> {
    if (!this.authClient) {
      console.error('Auth client not initialized');
      return false;
    }

    return new Promise((resolve) => {
      this.authClient!.login({
        identityProvider,
        onSuccess: async () => {
          await this.updateActor();
          resolve(true);
        },
        onError: (error) => {
          console.error('Login failed:', error);
          resolve(false);
        }
      });
    });
  }

  // Logout
  async logout(): Promise<void> {
    if (!this.authClient) return;

    await this.authClient.logout();
    await this.updateActor();
  }

  // Get current authentication state
  async getState(): Promise<AuthState | null> {
    if (!this.authClient) return null;

    const identity = this.authClient.getIdentity();
    const isAuthenticated = await this.authClient.isAuthenticated();
    const principal = identity.getPrincipal().toString();

    return {
      actor: this.actor,
      authClient: this.authClient,
      isAuthenticated,
      principal,
      identity
    };
  }

  // Get wallet address (principal ID)
  getWalletAddress(): string | null {
    if (!this.authClient) return null;
    return this.authClient.getIdentity().getPrincipal().toString();
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    if (!this.authClient) return false;
    return await this.authClient.isAuthenticated();
  }

  // Get actor for backend calls
  getActor(): any {
    return this.actor;
  }
}

// Singleton instance
let authClientInstance: FluxAuthClient | null = null;

export const getAuthClient = (onStateChange?: (state: AuthState) => void): FluxAuthClient => {
  if (!authClientInstance) {
    authClientInstance = new FluxAuthClient(onStateChange);
  }
  return authClientInstance;
};

export default FluxAuthClient;
