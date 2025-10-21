import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { firebaseConfig, FirebaseConfig } from '../config/firebase.config';

export const FIREBASE_APP = Symbol('FIREBASE_APP');
export const FIREBASE_AUTH = Symbol('FIREBASE_AUTH');

export const firebaseProviders: Provider[] = [
  {
    provide: FIREBASE_APP,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      const config = configService.get<FirebaseConfig>(firebaseConfig.KEY, {
        infer: true,
      });

      if (!config) {
        throw new Error('Firebase configuration is not available');
      }

      const existing = getApps().find((app) => app.name === '[DEFAULT]');
      if (existing) {
        return existing;
      }

      return initializeApp({
        credential: cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        }),
        projectId: config.projectId,
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
];
