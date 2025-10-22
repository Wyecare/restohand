import { createSlice, PayloadAction } from '@reduxjs/toolkit';
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
  status: 'loading',
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
      console.log('[authSlice] setAuthPending');
      state.status = 'loading';
      state.error = null;
    },
    setCredentials(state, action: PayloadAction<CredentialsPayload>) {
      const { idToken, refreshToken, expiresIn, session } = action.payload;
      console.log('[authSlice] setCredentials', {
        hasToken: !!idToken,
        expiresIn,
        session,
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
      console.log('[authSlice] updateToken', action.payload);
      state.idToken = action.payload.idToken;
      state.tokenExpiresAt =
        typeof action.payload.expiresIn === 'number'
          ? Date.now() + action.payload.expiresIn * 1000
          : state.tokenExpiresAt;
    },
    updateSession(state, action: PayloadAction<Partial<SessionInfo>>) {
      console.log('[authSlice] updateSession', action.payload);
      if (!state.session) return;
      state.session = {
        ...state.session,
        ...action.payload,
      };
    },
    setAuthError(state, action: PayloadAction<string>) {
      console.error('[authSlice] setAuthError', action.payload);
      state.error = action.payload;
      state.status = 'error';
    },
    clearAuthState(state) {
      console.log('[authSlice] clearAuthState');
      state.status = 'idle';
      state.error = null;
      state.idToken = null;
      state.refreshToken = null;
      state.tokenExpiresAt = null;
      state.session = null;
    },
  },
});

export const {
  setAuthPending,
  setCredentials,
  updateToken,
  updateSession,
  setAuthError,
  clearAuthState,
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
export const selectUserRoles = (state: { auth: AuthState }) =>
  state.auth.session?.roles ?? EMPTY_ROLES;
