import { useEffect, useCallback, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { env } from '@/config/env';
import { useAppSelector } from '@/store/hooks';
import { selectAuthState } from '@/store/slices/authSlice';

interface FCMTokenHookResult {
  isRegistering: boolean;
  hasPermission: boolean;
  fcmToken: string | null;
  registerToken: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
}

export const useFCMToken = (): FCMTokenHookResult => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const authState = useAppSelector(selectAuthState);

  // Configure notifications on mount
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }, []);

  // Request notification permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const granted = finalStatus === 'granted';
      setHasPermission(granted);

      if (!granted) {
        console.warn('⚠️ Notification permission not granted');
        return false;
      }

      console.log('✅ Notification permission granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }, []);

  // Get device push token
  const getDeviceToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = await Notifications.getDevicePushTokenAsync();

      if (Platform.OS === 'android') {
        // For Android, we get the FCM token directly
        return token.data;
      } else if (Platform.OS === 'ios') {
        // For iOS, we get the APNs token
        return token.data;
      }

      return token.data;
    } catch (error) {
      console.error('❌ Error getting device push token:', error);
      return null;
    }
  }, []);

  // Send token to backend
  const sendTokenToBackend = useCallback(async (token: string): Promise<boolean> => {
    if (!authState.idToken) {
      console.warn('⚠️ No auth token available, skipping FCM token registration');
      return false;
    }

    try {
      const response = await fetch(`${env.apiUrl}/call-waiter/fcm-token`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.idToken}`,
        },
        body: JSON.stringify({
          fcmToken: token,
        }),
      });

      if (response.ok) {
        console.log('✅ FCM token sent to backend successfully');
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Failed to send FCM token to backend:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Network error sending FCM token:', error);
      return false;
    }
  }, [authState.idToken]);

  // Main registration function
  const registerToken = useCallback(async (): Promise<boolean> => {
    if (isRegistering) {
      console.log('⏳ Token registration already in progress');
      return false;
    }

    if (!authState.idToken || authState.status !== 'authenticated') {
      console.warn('⚠️ User not authenticated, skipping FCM registration');
      return false;
    }

    setIsRegistering(true);

    try {
      console.log('🔄 Starting FCM token registration...');

      // Step 1: Request permissions
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        console.warn('⚠️ Cannot register FCM token without permissions');
        return false;
      }

      // Step 2: Get device token
      const token = await getDeviceToken();
      if (!token) {
        console.error('❌ Failed to get device push token');
        return false;
      }

      console.log('📱 Device push token obtained:', token.substring(0, 50) + '...');
      setFcmToken(token);

      // Step 3: Send to backend
      const success = await sendTokenToBackend(token);

      if (success) {
        console.log('🎉 FCM token registration completed successfully');
      }

      return success;
    } catch (error) {
      console.error('❌ FCM token registration failed:', error);
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, [
    isRegistering,
    authState.idToken,
    authState.status,
    requestPermissions,
    getDeviceToken,
    sendTokenToBackend,
  ]);

  // Refresh token (same as register but with logging)
  const refreshToken = useCallback(async (): Promise<boolean> => {
    console.log('🔄 Refreshing FCM token...');
    return await registerToken();
  }, [registerToken]);

  return {
    isRegistering,
    hasPermission,
    fcmToken,
    registerToken,
    refreshToken,
  };
};