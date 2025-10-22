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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
    const unsubscribe = onIdTokenChanged(
      auth,
      async (firebaseUser) => {
        console.log('[AuthProvider] onIdTokenChanged fired', firebaseUser?.uid);
        if (!firebaseUser) {
          setUser(null);
          dispatch(clearAuthState());
          console.log('[AuthProvider] cleared auth state because user is null');
          return;
        }

        setUser(firebaseUser);
        console.log('[AuthProvider] Firebase user set', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });

        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
           console.log('[AuthProvider] tokenResult', {
             token: tokenResult.token.slice(0, 10) + '...',
             expirationTime: tokenResult.expirationTime,
             claims: tokenResult.claims,
           });
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
          console.log('[AuthProvider] setCredentials dispatch complete');
        } catch (error) {
          dispatch(
            setAuthError(error instanceof Error ? error.message : 'Auth error')
          );
          console.error('[AuthProvider] setCredentials error', error);
        }
      },
      (error) => {
        dispatch(setAuthError(error.message));
        console.error('[AuthProvider] onIdTokenChanged error', error);
      }
    );

    return () => unsubscribe();
  }, [auth, dispatch]);

  useEffect(() => {
    if (!user) return;
    console.log('[AuthProvider] updating session with user fields', {
      displayName: user.displayName,
      email: user.email,
    });
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
    console.log('[AuthProvider] signInWithGoogle invoked');
    await signInWithPopup(auth, provider);
    console.log('[AuthProvider] signInWithGoogle completed');
  }, [auth]);

  const logout = useCallback(async () => {
    await signOut(auth);
    dispatch(clearAuthState());
    console.log('[AuthProvider] logout completed');
  }, [auth, dispatch]);

  const value = useMemo(
    () => ({
      user,
      signInWithGoogle,
      logout,
    }),
    [user, signInWithGoogle, logout]
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
