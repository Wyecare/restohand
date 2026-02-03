import { registerAs } from '@nestjs/config';

export interface CashfreeConfig {
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
}

export const cashfreeConfig = registerAs<CashfreeConfig>('cashfree', () => ({
  clientId: process.env.CASHFREE_APP_ID!,
  clientSecret: process.env.CASHFREE_SECRET_KEY!,
  webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET!,
  environment: (process.env.CASHFREE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
}));