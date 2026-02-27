import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectUserRoles } from '@/store/slices/authSlice';

export default function ServiceLayout() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const roles = useAppSelector(selectUserRoles);

  // Redirect cashier to their own section; redirect unauthenticated or non-waiters to login
  if (!isAuthenticated || !roles.includes('waiter')) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="session-management"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="menu"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="payment"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}