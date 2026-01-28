import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { checkTokenExpiry, selectAuthState } from '@/store/slices/authSlice';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useAppDispatch();
  const authState = useAppSelector(selectAuthState);

  useEffect(() => {
    // Check token expiry on app start and when auth state changes
    if (authState.idToken || authState.tokenExpiresAt) {
      dispatch(checkTokenExpiry());
    }
  }, [dispatch, authState.idToken, authState.tokenExpiresAt]);

  // Check token expiry periodically (every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      if (authState.status === 'authenticated') {
        dispatch(checkTokenExpiry());
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [dispatch, authState.status]);

  return <>{children}</>;
}