import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  MessagePayload,
  Messaging,
} from 'firebase/messaging';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// VAPID Key from environment variables
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'projectId', 'messagingSenderId', 'appId'];
  const missing = requiredFields.filter(field => !firebaseConfig[field]);

  if (missing.length > 0) {
    console.error('❌ Missing Firebase config fields:', missing);
    return false;
  }

  if (!VAPID_KEY) {
    console.error('❌ Missing VITE_FIREBASE_VAPID_KEY environment variable');
    return false;
  }

  console.log('✅ Firebase configuration validated');
  return true;
};

class FCMService {
  private app: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private initialized = false;

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Validate Firebase configuration
      if (!validateFirebaseConfig()) {
        return false;
      }

      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.log('Service Worker is not supported');
        return false;
      }

      // Check if push notifications are supported
      if (!('PushManager' in window)) {
        console.log('Push messaging is not supported');
        return false;
      }

      // Initialize Firebase app if not already initialized
      if (!getApps().length) {
        this.app = initializeApp(firebaseConfig);
      } else {
        this.app = getApps()[0];
      }

      // Get messaging instance (this will handle service worker registration)
      this.messaging = getMessaging(this.app);
      this.initialized = true;

      console.log('FCM Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize FCM service:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('Notification permission granted');
        return true;
      } else {
        console.log('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    if (!this.initialized) {
      const initResult = await this.initialize();
      if (!initResult) return null;
    }

    if (!this.messaging) {
      console.error('FCM messaging not initialized');
      return null;
    }

    try {
      // For now, skip service worker and just get token for foreground notifications
      // TODO: Once proper Firebase web app config is provided, enable service worker
      console.log('⚠️ FCM: Getting token without service worker (foreground only)');

      const token = await getToken(this.messaging, {
        vapidKey: VAPID_KEY
      });

      if (token) {
        console.log('FCM registration token:', token);
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  async registerToken(): Promise<string | null> {
    // Request permission first
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return null;

    // Get the token
    return await this.getToken();
  }

  // Note: This will be called from the hook that has access to RTK Query
  // The service no longer makes direct API calls
  async updateServerToken(token: string, updateFcmTokenFn: (token: string) => Promise<boolean>): Promise<boolean> {
    try {
      const result = await updateFcmTokenFn(token);
      return result;
    } catch (error) {
      console.error('Error updating FCM token on server:', error);
      return false;
    }
  }

  async registerAndUpdateToken(updateFcmTokenFn?: (token: string) => Promise<boolean>): Promise<string | null> {
    const token = await this.registerToken();

    if (token) {
      // Store token locally first
      localStorage.setItem('fcm_token', token);

      if (updateFcmTokenFn) {
        const updated = await this.updateServerToken(token, updateFcmTokenFn);
        if (updated) {
          console.log('✅ FCM token stored locally and sent to server');
        } else {
          console.warn('⚠️ FCM token stored locally but failed to send to server - will retry later');
        }
      } else {
        console.warn('⚠️ FCM token stored locally but no server update function provided');
      }

      // Return the token regardless of server update success
      return token;
    }

    return null;
  }

  onMessage(callback: (payload: MessagePayload) => void): void {
    if (!this.initialized || !this.messaging) {
      console.log('FCM Service not initialized');
      return;
    }

    onMessage(this.messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      callback(payload);
    });
  }

  async showNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<void> {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/icons/waiter-call.png',
          badge: '/icons/badge.png',
          ...options,
        });
      }
    }
  }

  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  getStoredToken(): string | null {
    return localStorage.getItem('fcm_token');
  }
}

// Create and export singleton instance
export const fcmService = new FCMService();

// Export types for use in components
export type { MessagePayload };
