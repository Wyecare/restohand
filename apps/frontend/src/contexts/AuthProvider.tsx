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
        if (!firebaseUser) {
          setUser(null);
          dispatch(clearAuthState());
          return;
        }

        setUser(firebaseUser);

        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
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
    await signInWithPopup(auth, provider);
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
