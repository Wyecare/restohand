import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  uri: string;
  dbName?: string;
  serverSelectionTimeoutMs: number;
}

export const databaseConfig = registerAs<DatabaseConfig>('database', () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('Missing required environment variable MONGODB_URI');
  }

  console.log(
    '🔗 Database Connection URI:',
    uri.includes('@') ? uri.replace(/\/\/(.*):.*@/, '//$1:****@') : uri
  );
  const dbName = 'restohand';
  const serverSelectionTimeoutMs = Number(
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 5000
  );

  return {
    uri,
    dbName: dbName?.trim() || undefined,
    serverSelectionTimeoutMs,
  };
});
