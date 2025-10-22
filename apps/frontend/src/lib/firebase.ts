import { initializeApp, type FirebaseApp, getApps } from 'firebase/app';
import {
  browserPopupRedirectResolver,
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
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

export const getFirebaseAuth = () => {
  const app = getFirebaseApp();
  try {
    return getAuth(app);
  } catch {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  }
};
