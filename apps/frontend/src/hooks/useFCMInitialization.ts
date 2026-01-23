import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  selectIsAuthenticated,
  selectUserRoles,
} from '@/store/slices/authSlice';
import { useUpdateFcmTokenMutation } from '@/store/api/fcmApi';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

interface FCMInitializationState {
  isSupported: boolean;
  isInitialized: boolean;
  hasPermission: boolean;
  token: string | null;
  error: string | null;
}

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const useFCMInitialization = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const userRoles = useAppSelector(selectUserRoles);
  const [updateFcmToken] = useUpdateFcmTokenMutation();

  const [state, setState] = useState<FCMInitializationState>({
    isSupported: false,
    isInitialized: false,
    hasPermission: false,
    token: null,
    error: null,
  });

  useEffect(() => {
    // Only initialize for authenticated users
    if (!isAuthenticated) {
      console.log('FCM: Skipping initialization - user not authenticated');
      return;
    }

    const initializeFCM = async () => {
      console.log(
        `🔔 Starting FCM initialization for user with roles: [${userRoles.join(
          ', '
        )}]`
      );

      try {
        // Check browser support
        if (
          !('serviceWorker' in navigator) ||
          !('PushManager' in window) ||
          !('Notification' in window)
        ) {
          console.warn('FCM: Browser not supported');
          setState((prev) => ({
            ...prev,
            isSupported: false,
            error: 'Push notifications not supported in this browser',
          }));
          return;
        }

        setState((prev) => ({ ...prev, isSupported: true }));
        console.log('✅ FCM: Browser support confirmed');

        // Validate Firebase config
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !VAPID_KEY) {
          console.error('❌ Missing Firebase configuration');
          setState((prev) => ({
            ...prev,
            error: 'Missing Firebase configuration',
          }));
          return;
        }

        // Initialize Firebase
        let app;
        if (!getApps().length) {
          app = initializeApp(firebaseConfig);
        } else {
          app = getApps()[0];
        }

        const messaging = getMessaging(app);
        setState((prev) => ({ ...prev, isInitialized: true }));
        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('⚠️ FCM: Notification permission denied');
          setState((prev) => ({
            ...prev,
            hasPermission: false,
            error: 'Notification permission denied',
          }));
          return;
        }

        const token = await getToken(messaging, { vapidKey: VAPID_KEY });

        if (token) {
          localStorage.setItem('fcm_token', token);

          // Send token to server using RTK Query
          try {
            const result = await updateFcmToken({ fcmToken: token }).unwrap();

            setState((prev) => ({
              ...prev,
              hasPermission: true,
              token,
            }));
          } catch (error: any) {
            // Still set the token locally even if server update fails
            setState((prev) => ({
              ...prev,
              hasPermission: true,
              token,
              error: 'Token generated but failed to send to server',
            }));
          }

          // Set up foreground message listener
          onMessage(messaging, (payload) => {
            console.log('📱 FCM: Foreground message received:', payload);

            // Show notification
            if (payload.notification) {
              new Notification(
                payload.notification.title || 'New notification',
                {
                  body: payload.notification.body,
                  icon: '/favicon.ico',
                  data: payload.data,
                }
              );
            }
          });
        } else {
          console.warn('⚠️ FCM: Failed to get token');
          setState((prev) => ({
            ...prev,
            hasPermission: false,
            error: 'Failed to get FCM token',
          }));
        }
      } catch (error) {
        console.error('❌ FCM: Initialization failed:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    initializeFCM();
  }, [isAuthenticated, userRoles, updateFcmToken]);

  return state;
};
