import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import type { SessionInfo } from '../api/types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  error: string | null;
  idToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  session: SessionInfo | null;
}

const initialState: AuthState = {
  status: 'idle', // Start as idle, will be set to loading during auth actions
  error: null,
  idToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  session: null,
};

interface CredentialsPayload {
  idToken: string;
  refreshToken?: string;
  expiresIn?: number; // seconds until expiry
  session: SessionInfo;
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
      const { idToken, refreshToken, expiresIn, session } = action.payload;

      console.log('🔑 Setting credentials:', {
        hasIdToken: !!idToken,
        sessionId: session?.id,
        userId: session?.userId,
        restaurantId: session?.restaurantId,
        roles: session?.roles,
        displayName: session?.displayName,
      });

      state.idToken = idToken;
      state.refreshToken = refreshToken ?? state.refreshToken;
      state.tokenExpiresAt =
        typeof expiresIn === 'number'
          ? Date.now() + expiresIn * 1000
          : state.tokenExpiresAt;
      state.session = session;
      state.status = 'authenticated';
      state.error = null;
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
    updateSession(state, action: PayloadAction<Partial<SessionInfo>>) {
      if (!state.session) return;
      state.session = {
        ...state.session,
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
      state.session = null;
    },
    checkTokenExpiry(state) {
      // Check if token is expired
      if (state.tokenExpiresAt && Date.now() >= state.tokenExpiresAt) {
        console.log('🔑 Token expired, clearing auth state');
        state.status = 'idle';
        state.idToken = null;
        state.refreshToken = null;
        state.tokenExpiresAt = null;
        state.session = null;
        state.error = 'Token expired';
      } else if (state.idToken && state.session) {
        // Token is still valid
        state.status = 'authenticated';
        state.error = null;
        console.log('🔑 Token is still valid, user is authenticated');
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE, (state, action) => {
      console.log('🔄 Rehydrating auth state');
      if (action.payload && action.payload.auth) {
        const persistedAuth = action.payload.auth as AuthState;

        // Check if persisted token is still valid
        if (persistedAuth.tokenExpiresAt && Date.now() >= persistedAuth.tokenExpiresAt) {
          console.log('🔑 Persisted token expired, staying logged out');
          state.status = 'idle';
        } else if (persistedAuth.idToken && persistedAuth.session) {
          console.log('🔑 Restoring valid auth session');
          state.status = 'authenticated';
          state.idToken = persistedAuth.idToken;
          state.refreshToken = persistedAuth.refreshToken;
          state.tokenExpiresAt = persistedAuth.tokenExpiresAt;
          state.session = persistedAuth.session;
          state.error = null;
        } else {
          console.log('🔑 No valid persisted auth data');
          state.status = 'idle';
        }
      }
    });
  },
});

export const {
  setAuthPending,
  setCredentials,
  updateToken,
  updateSession,
  setAuthError,
  clearAuthState,
  checkTokenExpiry,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuthState = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.status === 'authenticated' && !!state.auth.idToken;
export const selectAuthSession = (state: { auth: AuthState }) =>
  state.auth.session;
export const selectActiveRestaurantId = (state: { auth: AuthState }) =>
  state.auth.session?.restaurantId ?? null;
const EMPTY_ROLES: string[] = [];
export const selectUserRoles = (state: { auth: AuthState }) => {
  const roles = state.auth.session?.roles ?? EMPTY_ROLES;
  return roles;
};