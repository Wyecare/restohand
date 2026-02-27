import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectUserRoles } from '@/store/slices/authSlice';

export default function CashierLayout() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const roles = useAppSelector(selectUserRoles);

  if (!isAuthenticated || !roles.includes('cashier')) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
