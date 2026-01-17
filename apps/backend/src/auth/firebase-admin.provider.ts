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
      const existing = getApps().find((app) => app.name === '[DEFAULT]');
      if (existing) {
        return existing;
      }

      // Debug environment information
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('Current working directory:', process.cwd());

      // Get Firebase configuration from environment variables
      const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
      const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY');
      const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const privateKeyId = configService.get<string>('FIREBASE_PRIVATE_KEY_ID');
      const clientId = configService.get<string>('FIREBASE_CLIENT_ID');

      // Validate required environment variables
      if (!projectId || !privateKey || !clientEmail) {
        throw new Error('Missing required Firebase environment variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
      }

      // Create service account object from environment variables
      const serviceAccount = {
        type: "service_account",
        project_id: projectId,
        private_key_id: privateKeyId || "",
        private_key: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
        client_email: clientEmail,
        client_id: clientId || "",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        universe_domain: "googleapis.com"
      };

      const storageBucket = configService.get<string>('FIREBASE_STORAGE_BUCKET') || `${projectId}.firebasestorage.app`;

      console.log('=== FIREBASE ADMIN INITIALIZATION DEBUG ===');
      console.log('Project ID:', projectId);
      console.log('Client email:', clientEmail);
      console.log('Storage bucket:', storageBucket);
      console.log('Using environment variables for Firebase credentials');

      return initializeApp({
        credential: cert(serviceAccount as any),
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
