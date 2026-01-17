import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import * as path from 'path';

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

      // Debug environment and path information
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('Current working directory:', process.cwd());
      console.log('__dirname:', __dirname);

      // Use service account file path (development vs production)
      const serviceAccountPath = process.env.NODE_ENV === 'production'
        ? path.join(__dirname, 'firebase-service-account.json')
        : path.resolve(__dirname, '../../../firebase-service-account.json');

      // Read project ID from service account file for consistency
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(require('fs').readFileSync(serviceAccountPath, 'utf8'));
      } catch (error) {
        console.error('Failed to read service account file:', error);
        throw error;
      }

      const projectId = serviceAccount.project_id;
      const storageBucket = configService.get<string>('FIREBASE_STORAGE_BUCKET') || `${projectId}.firebasestorage.app`;

      console.log('=== FIREBASE ADMIN INITIALIZATION DEBUG ===');
      console.log('Resolved service account path:', serviceAccountPath);
      console.log('File exists:', require('fs').existsSync(serviceAccountPath));
      console.log('Project ID from service account:', projectId);
      console.log('Using storage bucket:', storageBucket);
      console.log('Service account client_email:', serviceAccount.client_email);

      return initializeApp({
        credential: cert(serviceAccountPath),
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
