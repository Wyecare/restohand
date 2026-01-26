import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  // Configure Express body parser with webhook support
  app.use('/api/webhooks', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Add basic request logging
  app.use((req: any, _res: any, next: any) => {
    if (req.url.includes('upload-image')) {
      console.log('🌐 Incoming request:', {
        method: req.method,
        url: req.url,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
        timestamp: new Date().toISOString(),
      });
    }
    next();
  });

  app.enableCors();
  app.useWebSocketAdapter(new IoAdapter(app));

  const globalPrefix =
    configService.get<string>('app.globalPrefix', { infer: true }) ?? 'api';
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const allowedOrigins =
    configService.get<string[]>('app.allowedOrigins', { infer: true }) ?? [];

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Restohand API')
    .setDescription('API documentation for the Restohand platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);

  const port = configService.get<number>('app.port', { infer: true }) ?? 3000;
  await app.listen(port);
  const projectId = configService?.get<string>('FIREBASE_PROJECT_ID');
  console.log('Firebase Project ID:', projectId);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  if (Array.isArray(allowedOrigins) && allowedOrigins.length) {
    Logger.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
  }
}

bootstrap();
