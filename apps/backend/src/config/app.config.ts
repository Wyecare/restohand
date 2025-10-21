import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  globalPrefix: string;
  allowedOrigins: string[];
}

export const appConfig = registerAs<AppConfig>('app', () => {
  const rawOrigins = process.env.ALLOWED_ORIGINS ?? '';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    port: Number(process.env.API_PORT ?? process.env.PORT ?? 3000),
    globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
    allowedOrigins,
  };
});
