type Booleanish = boolean | 'true' | 'false';

const toBoolean = (value: string | Booleanish | undefined, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return fallback;
};

export const env = {
  environment: import.meta.env.VITE_ENV ?? 'development',
  appName: import.meta.env.VITE_APP_NAME ?? 'Restohand',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3334/api',
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL ?? 'http://localhost:3000',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  upiMode: import.meta.env.VITE_UPI_MODE ?? 'static',
  billDownloadUrlTemplate:
    import.meta.env.VITE_BILL_DOWNLOAD_URL ??
    'http://localhost:3000/api/orders/:orderId/bill',
  analyticsEnabled: toBoolean(import.meta.env.VITE_ANALYTICS_ENABLED, false),
  firebaseConfig: (() => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const appId = import.meta.env.VITE_FIREBASE_APP_ID;
    const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
    const authEmulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL;

    if (!apiKey || !authDomain || !projectId || !appId) {
      return null;
    }

    return {
      apiKey,
      authDomain,
      projectId,
      appId,
      measurementId,
      authEmulatorUrl,
    };
  })(),
} as const;

export type FrontendEnv = typeof env;
