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
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:3000',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  upiMode: import.meta.env.VITE_UPI_MODE ?? 'static',
  billDownloadUrlTemplate:
    import.meta.env.VITE_BILL_DOWNLOAD_URL ??
    'http://localhost:3000/api/orders/:orderId/bill',
  analyticsEnabled: toBoolean(import.meta.env.VITE_ANALYTICS_ENABLED, false),
} as const;

export type FrontendEnv = typeof env;
