import { initializeApp, type FirebaseApp, getApps } from 'firebase/app';
import {
  browserPopupRedirectResolver,
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from 'firebase/auth';
import { env } from '@/config/env';

let firebaseApp: FirebaseApp | null = null;

export const getFirebaseApp = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!env.firebaseConfig) {
    throw new Error('Missing Firebase web configuration.');
  }

  const apps = getApps();
  firebaseApp = apps.length
    ? apps[0]
    : initializeApp({
        apiKey: env.firebaseConfig.apiKey,
        authDomain: env.firebaseConfig.authDomain,
        projectId: env.firebaseConfig.projectId,
        appId: env.firebaseConfig.appId,
        measurementId: env.firebaseConfig.measurementId,
      });

  return firebaseApp;
};

let authInstance: any = null;

export const getFirebaseAuth = () => {
  if (authInstance) {
    return authInstance;
  }

  const app = getFirebaseApp();
  try {
    authInstance = getAuth(app);
  } catch {
    authInstance = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  }

  // Connect to emulator if configured and in development
  if (env.firebaseConfig?.authEmulatorUrl && env.environment === 'development') {
    try {
      connectAuthEmulator(authInstance, env.firebaseConfig.authEmulatorUrl);
      console.log('🔥 Connected to Firebase Auth Emulator at', env.firebaseConfig.authEmulatorUrl);
    } catch (error) {
      console.warn('Failed to connect to Firebase Auth Emulator:', error);
    }
  }

  return authInstance;
};
