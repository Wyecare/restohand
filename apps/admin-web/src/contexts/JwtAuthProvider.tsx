import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { useAppDispatch } from '@/store/hooks';
import {
  clearAuthState,
  setAuthError,
  setAuthPending,
  setCredentials,
  updateSession,
} from '@/store/slices/authSlice';
import { authService, AuthResponse } from '@/services/auth.service';
import { useFCMInitialization } from '@/hooks/useFCMInitialization';
import type { SessionInfo } from '@/store/api/types';

interface User {
  uid: string;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  roles: string[];
  restaurantId?: string;
  branchId?: string;
}

interface AuthContextValue {
  user: User | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const mapAuthResponseToSession = (authResponse: AuthResponse): SessionInfo => ({
  userId: authResponse.user.uid,
  displayName: authResponse.user.displayName,
  email: authResponse.user.email,
  phoneNumber: authResponse.user.phoneNumber,
  restaurantId: authResponse.user.restaurantId,
  branchId: authResponse.user.branchId,
  roles: authResponse.user.roles,
});

const mapAuthResponseToUser = (authResponse: AuthResponse): User => ({
  uid: authResponse.user.uid,
  email: authResponse.user.email,
  phoneNumber: authResponse.user.phoneNumber,
  displayName: authResponse.user.displayName,
  photoURL: authResponse.user.photoURL,
  roles: authResponse.user.roles,
  restaurantId: authResponse.user.restaurantId,
  branchId: authResponse.user.branchId,
});

export const JwtAuthProvider = ({ children }: PropsWithChildren) => {
  const dispatch = useAppDispatch();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize FCM for all authenticated users
  const fcmState = useFCMInitialization();

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      dispatch(setAuthPending());
      setIsLoading(true);

      try {
        const accessToken = authService.getAccessToken();
        const refreshToken = authService.getRefreshToken();

        if (accessToken && refreshToken) {
          // Try to refresh the token to validate it and get user info
          try {
            const authResponse = await authService.refreshToken(refreshToken);

            // Update stored tokens
            authService.setTokens(
              authResponse.access_token,
              authResponse.refresh_token
            );

            // Update state
            const sessionInfo = mapAuthResponseToSession(authResponse);
            const userData = mapAuthResponseToUser(authResponse);

            setUser(userData);
            dispatch(
              setCredentials({
                idToken: authResponse.access_token,
                refreshToken: authResponse.refresh_token,
                expiresIn: authResponse.expires_in,
                session: sessionInfo,
              })
            );
          } catch (refreshError) {
            console.warn('Token refresh failed, clearing auth state');
            authService.clearTokens();
            setUser(null);
            dispatch(clearAuthState());
          }
        } else {
          setUser(null);
          dispatch(clearAuthState());
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
        dispatch(clearAuthState());
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [dispatch]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true);
        dispatch(setAuthPending());

        const authResponse = await authService.login({ email, password });

        // Store tokens
        authService.setTokens(
          authResponse.access_token,
          authResponse.refresh_token
        );

        // Update state
        const sessionInfo = mapAuthResponseToSession(authResponse);
        const userData = mapAuthResponseToUser(authResponse);

        console.log('🔄 JWT Auth Response Debug:', {
          originalResponse: authResponse,
          sessionInfo,
          userData,
        });

        setUser(userData);
        dispatch(
          setCredentials({
            idToken: authResponse.access_token,
            refreshToken: authResponse.refresh_token,
            expiresIn: authResponse.expires_in,
            session: sessionInfo,
          })
        );

        console.log('✅ JWT sign-in completed successfully');
      } catch (error: any) {
        console.error('❌ JWT sign-in error:', error);

        let errorMessage = 'Sign-in failed';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        dispatch(setAuthError(errorMessage));
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      try {
        setIsLoading(true);
        dispatch(setAuthPending());

        const authResponse = await authService.register({
          email,
          password,
          name,
        });

        // Store tokens
        authService.setTokens(
          authResponse.access_token,
          authResponse.refresh_token
        );

        // Update state
        const sessionInfo = mapAuthResponseToSession(authResponse);
        const userData = mapAuthResponseToUser(authResponse);

        setUser(userData);
        dispatch(
          setCredentials({
            idToken: authResponse.access_token,
            refreshToken: authResponse.refresh_token,
            expiresIn: authResponse.expires_in,
            session: sessionInfo,
          })
        );

        console.log('✅ JWT registration completed successfully');
      } catch (error: any) {
        console.error('❌ JWT registration error:', error);

        let errorMessage = 'Registration failed';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        dispatch(setAuthError(errorMessage));
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    try {
      authService.clearTokens();
      setUser(null);
      dispatch(clearAuthState());
      console.log('✅ Logout completed successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }, [dispatch]);

  // Update session when user changes
  useEffect(() => {
    if (!user) return;
    dispatch(
      updateSession({
        displayName: user.displayName,
        email: user.email,
        phoneNumber: user.phoneNumber,
      })
    );
  }, [user, dispatch]);

  const value = useMemo(
    () => ({
      user,
      signInWithEmail,
      register,
      logout,
      isLoading,
    }),
    [user, signInWithEmail, register, logout, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useJwtAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useJwtAuth must be used within a JwtAuthProvider');
  }
  return ctx;
};
