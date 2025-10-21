import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { DatabaseConfig } from '../config/database.config';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { uri, dbName, serverSelectionTimeoutMs } =
          configService.get<DatabaseConfig>('database', { infer: true })!;

        return {
          uri,
          dbName,
          serverSelectionTimeoutMS: serverSelectionTimeoutMs,
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
