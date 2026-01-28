import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import {
  selectIsAuthenticated,
  selectUserRoles,
} from '@/store/slices/authSlice';

export default function KitchenLayout() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const roles = useAppSelector(selectUserRoles);

  // Redirect if not authenticated or not a chef
  if (!isAuthenticated || !roles.includes('chef')) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
