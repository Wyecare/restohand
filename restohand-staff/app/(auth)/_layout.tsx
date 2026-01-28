import { useMemo } from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import { selectAuthState } from '@/store/slices/authSlice';

export default function AuthLayout() {
  const authState = useAppSelector(selectAuthState);

  // Memoize the redirect logic to prevent infinite loops
  const redirectTo = useMemo(() => {
    if (authState.status === 'authenticated' && authState.session?.roles?.length > 0) {
      const roles = authState.session.roles;
      if (roles.includes('chef')) {
        return '/(kitchen)';
      } else if (roles.includes('waiter') || roles.includes('cashier') || roles.includes('manager')) {
        return '/(service)';
      }
    }
    return null;
  }, [authState.status, authState.session?.roles]);

  // If user is authenticated, redirect to appropriate screen
  if (redirectTo) {
    return <Redirect href={redirectTo} />;
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="invite-signup" options={{ headerShown: false }} />
    </Stack>
  );
}