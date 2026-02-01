import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SuperAdminUser } from '../api/types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  error: string | null;
  idToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  user: SuperAdminUser | null;
}

// Restore auth state from localStorage
const getInitialAuthState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      status: 'idle',
      error: null,
      idToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      user: null,
    };
  }

  try {
    const storedToken = localStorage.getItem('admin-auth-token');
    const storedUser = localStorage.getItem('admin-auth-user');
    const storedExpiry = localStorage.getItem('admin-auth-expiry');

    if (storedToken && storedUser && storedExpiry) {
      const expiresAt = parseInt(storedExpiry);
      const now = Date.now();

      // Check if token is still valid
      if (expiresAt > now) {
        return {
          status: 'authenticated',
          error: null,
          idToken: storedToken,
          refreshToken: localStorage.getItem('admin-auth-refresh-token'),
          tokenExpiresAt: expiresAt,
          user: JSON.parse(storedUser),
        };
      } else {
        // Token expired, clear storage
        localStorage.removeItem('admin-auth-token');
        localStorage.removeItem('admin-auth-user');
        localStorage.removeItem('admin-auth-expiry');
        localStorage.removeItem('admin-auth-refresh-token');
      }
    }
  } catch (error) {
    console.warn('Failed to restore auth state from localStorage:', error);
  }

  return {
    status: 'idle',
    error: null,
    idToken: null,
    refreshToken: null,
    tokenExpiresAt: null,
    user: null,
  };
};

const initialState: AuthState = getInitialAuthState();

interface CredentialsPayload {
  idToken: string;
  refreshToken?: string;
  expiresIn?: number; // seconds until expiry
  user: SuperAdminUser;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthPending(state) {
      state.status = 'loading';
      state.error = null;
    },

    setCredentials(state, action: PayloadAction<CredentialsPayload>) {
      const { idToken, refreshToken, expiresIn, user } = action.payload;

      console.log('🔑 Setting super admin credentials:', {
        hasIdToken: !!idToken,
        userId: user?.id,
        email: user?.email,
        roles: user?.roles,
      });

      const tokenExpiresAt = typeof expiresIn === 'number'
        ? Date.now() + expiresIn * 1000
        : state.tokenExpiresAt;

      state.idToken = idToken;
      state.refreshToken = refreshToken ?? state.refreshToken;
      state.tokenExpiresAt = tokenExpiresAt;
      state.user = user;
      state.status = 'authenticated';
      state.error = null;

      // Persist to localStorage
      try {
        localStorage.setItem('admin-auth-token', idToken);
        localStorage.setItem('admin-auth-user', JSON.stringify(user));
        if (tokenExpiresAt) {
          localStorage.setItem('admin-auth-expiry', tokenExpiresAt.toString());
        }
        if (refreshToken) {
          localStorage.setItem('admin-auth-refresh-token', refreshToken);
        }
      } catch (error) {
        console.warn('Failed to persist auth state to localStorage:', error);
      }
    },

    updateToken(
      state,
      action: PayloadAction<{ idToken: string; expiresIn?: number }>
    ) {
      state.idToken = action.payload.idToken;
      state.tokenExpiresAt =
        typeof action.payload.expiresIn === 'number'
          ? Date.now() + action.payload.expiresIn * 1000
          : state.tokenExpiresAt;
    },

    updateUser(state, action: PayloadAction<Partial<SuperAdminUser>>) {
      if (!state.user) return;
      state.user = {
        ...state.user,
        ...action.payload,
      };
    },

    setAuthError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.status = 'error';
    },

    clearAuthState(state) {
      state.status = 'idle';
      state.error = null;
      state.idToken = null;
      state.refreshToken = null;
      state.tokenExpiresAt = null;
      state.user = null;

      // Clear localStorage
      try {
        localStorage.removeItem('admin-auth-token');
        localStorage.removeItem('admin-auth-user');
        localStorage.removeItem('admin-auth-expiry');
        localStorage.removeItem('admin-auth-refresh-token');
      } catch (error) {
        console.warn('Failed to clear auth state from localStorage:', error);
      }
    },
  },
});

export const {
  setAuthPending,
  setCredentials,
  updateToken,
  updateUser,
  setAuthError,
  clearAuthState,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuthState = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.status === 'authenticated' && !!state.auth.idToken;
export const selectAuthUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsSuperAdmin = (state: { auth: AuthState }) =>
  state.auth.user?.roles?.includes('super_admin') ?? false;