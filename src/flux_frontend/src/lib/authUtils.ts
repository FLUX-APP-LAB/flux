/**
 * Authentication utilities for managing authentication state
 * Only stores non-sensitive information in localStorage
 */

export interface AuthState {
  hasValidSession: boolean;
  lastAuthCheck: number;
  principalId?: string;
}

const AUTH_STATE_KEY = 'flux_auth_state';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export const authUtils = {
  /**
   * Save minimal auth state to localStorage (non-sensitive info only)
   */
  saveAuthState: (isAuthenticated: boolean, principal?: string) => {
    try {
      const authState: AuthState = {
        hasValidSession: isAuthenticated,
        lastAuthCheck: Date.now(),
        principalId: principal || undefined,
      };
      localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState));
    } catch (error) {
      console.warn('Failed to save auth state to localStorage:', error);
    }
  },

  /**
   * Get saved auth state from localStorage
   */
  getAuthState: (): AuthState | null => {
    try {
      const saved = localStorage.getItem(AUTH_STATE_KEY);
      if (!saved) return null;

      const authState: AuthState = JSON.parse(saved);
      
      // Check if the saved state is still valid (not expired)
      const isExpired = Date.now() - authState.lastAuthCheck > SESSION_TIMEOUT;
      if (isExpired) {
        authUtils.clearAuthState();
        return null;
      }

      return authState;
    } catch (error) {
      console.warn('Failed to get auth state from localStorage:', error);
      authUtils.clearAuthState();
      return null;
    }
  },

  /**
   * Clear auth state from localStorage
   */
  clearAuthState: () => {
    try {
      localStorage.removeItem(AUTH_STATE_KEY);
    } catch (error) {
      console.warn('Failed to clear auth state from localStorage:', error);
    }
  },

  /**
   * Check if we should attempt automatic authentication
   * based on saved state
   */
  shouldAttemptAutoAuth: (): boolean => {
    const authState = authUtils.getAuthState();
    return authState?.hasValidSession === true;
  }
};
