import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

export const FIREBASE_APP = Symbol('FIREBASE_APP');
export const FIREBASE_AUTH = Symbol('FIREBASE_AUTH');
export const FIREBASE_STORAGE = Symbol('FIREBASE_STORAGE');

export const firebaseProviders: Provider[] = [
  {
    provide: FIREBASE_APP,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      const projectId = configService.getOrThrow<string>('FIREBASE_PROJECT_ID');
      const clientEmail = configService.getOrThrow<string>(
        'FIREBASE_CLIENT_EMAIL'
      );
      const privateKey = configService
        .getOrThrow<string>('FIREBASE_PRIVATE_KEY')
        .replace(/\\n/g, '\n');

      const existing = getApps().find((app) => app.name === '[DEFAULT]');
      if (existing) {
        return existing;
      }

      const storageBucket = configService.get<string>('FIREBASE_STORAGE_BUCKET') || `${projectId}.firebasestorage.app`;

      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
        storageBucket,
      });
    },
  },
  {
    provide: FIREBASE_AUTH,
    inject: [FIREBASE_APP],
    useFactory: (app: App) => {
      const auth = getAuth(app);
      return auth;
    },
  },
  {
    provide: FIREBASE_STORAGE,
    inject: [FIREBASE_APP],
    useFactory: (app: App) => {
      const storage = getStorage(app);
      return storage;
    },
  },
];
