import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret:
    process.env.JWT_ACCESS_SECRET ||
    'your-super-secret-jwt-key-change-this-in-production',
  expiresIn: '30d',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    'your-super-secret-refresh-key-change-this-in-production',
  refreshExpiresIn: process.env.JWT_REFRESH_TTL || '60d',
}));
