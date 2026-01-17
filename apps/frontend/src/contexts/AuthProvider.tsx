import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { useCallback } from 'react';
import { useAppDispatch } from '@/store/hooks';
import {
  clearAuthState,
  setAuthError,
  setAuthPending,
  setCredentials,
  updateSession,
} from '@/store/slices/authSlice';
import { getFirebaseAuth } from '@/lib/firebase';
import type { SessionInfo } from '@/store/api/types';

interface AuthContextValue {
  user: FirebaseUser | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Utility to detect mobile devices
const isMobileDevice = () => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const mapClaimsToSession = (user: FirebaseUser, claims: any): SessionInfo => ({
  userId: user.uid,
  displayName: user.displayName ?? undefined,
  email: user.email ?? undefined,
  phoneNumber: user.phoneNumber ?? undefined,
  restaurantId: claims?.restaurantId ?? claims?.restaurant_id ?? undefined,
  roles: Array.isArray(claims?.roles)
    ? claims.roles
    : claims?.role
    ? [claims.role]
    : [],
});

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const dispatch = useAppDispatch();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const auth = useMemo(() => getFirebaseAuth(), []);

  useEffect(() => {
    dispatch(setAuthPending());

    // Handle redirect results on app startup
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log('✅ User signed in via redirect:', result.user.email);
        }
      })
      .catch((error) => {
        console.error('❌ Redirect sign-in error:', error);
        dispatch(setAuthError(error.message));
      });

    const unsubscribe = onIdTokenChanged(
      auth,
      async (firebaseUser) => {
        if (!firebaseUser) {
          setUser(null);
          dispatch(clearAuthState());
          return;
        }

        setUser(firebaseUser);

        try {
          console.log('=== FRONTEND TOKEN GENERATION START ===');
          const tokenResult = await firebaseUser.getIdTokenResult();

          console.log('Firebase User Info:', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          });

          console.log('Token Result Info:', {
            tokenLength: tokenResult.token?.length,
            tokenPrefix: tokenResult.token?.substring(0, 50) + '...',
            expirationTime: tokenResult.expirationTime,
            issuedAtTime: tokenResult.issuedAtTime,
            signInProvider: tokenResult.signInProvider,
            authTime: tokenResult.authTime
          });

          // Parse the token to see what's inside
          try {
            const parts = tokenResult.token.split('.');
            if (parts.length >= 2) {
              const header = JSON.parse(atob(parts[0]));
              const payload = JSON.parse(atob(parts[1]));
              console.log('Frontend Token Header:', header);
              console.log('Frontend Token Payload:', {
                iss: payload.iss,
                aud: payload.aud,
                exp: payload.exp,
                iat: payload.iat,
                sub: payload.sub,
                auth_time: payload.auth_time,
                exp_readable: new Date(payload.exp * 1000).toISOString(),
                iat_readable: new Date(payload.iat * 1000).toISOString()
              });
            }
          } catch (parseError) {
            console.log('Failed to parse frontend token:', parseError);
          }

          const session = mapClaimsToSession(firebaseUser, tokenResult.claims);

          dispatch(
            setCredentials({
              idToken: tokenResult.token,
              refreshToken: firebaseUser.refreshToken ?? undefined,
              expiresIn: tokenResult.expirationTime
                ? (new Date(tokenResult.expirationTime).getTime() -
                    Date.now()) /
                  1000
                : undefined,
              session,
            })
          );

          console.log('=== FRONTEND TOKEN GENERATION END ===');
        } catch (error) {
          dispatch(
            setAuthError(error instanceof Error ? error.message : 'Auth error')
          );
        }
      },
      (error) => {
        dispatch(setAuthError(error.message));
      }
    );

    return () => unsubscribe();
  }, [auth, dispatch]);

  useEffect(() => {
    if (!user) return;
    dispatch(
      updateSession({
        displayName: user.displayName ?? undefined,
        email: user.email ?? undefined,
        phoneNumber: user.phoneNumber ?? undefined,
      })
    );
  }, [user, dispatch]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const isMobile = isMobileDevice();

    console.log(`🔍 Starting Google sign-in (${isMobile ? 'mobile' : 'desktop'})`);

    if (isMobile) {
      // Use redirect for mobile devices by default
      console.log('📱 Using redirect flow for mobile device');
      await signInWithRedirect(auth, provider);
      return; // Redirect doesn't return immediately
    }

    // Try popup first for desktop, with fallback to redirect
    try {
      console.log('🖥️ Attempting popup sign-in for desktop');
      await signInWithPopup(auth, provider);
      console.log('✅ Popup sign-in successful');
    } catch (error: any) {
      console.warn('⚠️ Popup sign-in failed:', error.code, error.message);

      // Check for popup-related errors
      if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/unauthorized-domain'
      ) {
        console.log('🔄 Falling back to redirect sign-in');
        await signInWithRedirect(auth, provider);
        return; // Redirect doesn't return immediately
      }

      // Re-throw other errors
      throw error;
    }
  }, [auth]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, [auth]);

  const logout = useCallback(async () => {
    await signOut(auth);
    dispatch(clearAuthState());
  }, [auth, dispatch]);

  const value = useMemo(
    () => ({
      user,
      signInWithGoogle,
      signInWithEmail,
      logout,
    }),
    [user, signInWithGoogle, signInWithEmail, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
