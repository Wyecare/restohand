import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectUserRoles } from '@/store/slices/authSlice';

export default function ServiceLayout() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const roles = useAppSelector(selectUserRoles);

  // Redirect if not authenticated or not a waiter/cashier
  if (!isAuthenticated || (!roles.includes('waiter') && !roles.includes('cashier'))) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
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
    </Stack>
  );
}