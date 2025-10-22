import { registerAs } from '@nestjs/config';

export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  webApiKey: string;
  authEmulatorHost?: string;
}

export const firebaseConfig = registerAs<FirebaseConfig>('firebase', () => {
  console.log('Loading Firebase configuration from environment variables');
  console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const webApiKey = process.env.FIREBASE_WEB_API_KEY;

  if (!projectId || !clientEmail || !privateKey || !webApiKey) {
    throw new Error('Missing Firebase configuration environment variables');
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
    webApiKey,
    // authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
  };
});
