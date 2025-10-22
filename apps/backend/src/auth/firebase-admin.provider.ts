import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const FIREBASE_APP = Symbol('FIREBASE_APP');
export const FIREBASE_AUTH = Symbol('FIREBASE_AUTH');

export const firebaseProviders: Provider[] = [
  {
    provide: FIREBASE_APP,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      const projectId =
        configService.getOrThrow<string>('FIREBASE_PROJECT_ID');
      const clientEmail =
        configService.getOrThrow<string>('FIREBASE_CLIENT_EMAIL');
      const privateKey = configService
        .getOrThrow<string>('FIREBASE_PRIVATE_KEY')
        .replace(/\\n/g, '\n');

      const existing = getApps().find((app) => app.name === '[DEFAULT]');
      if (existing) {
        return existing;
      }

      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
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
