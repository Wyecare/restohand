import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { SuperAdminSeeder } from './seeders/super-admin.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    console.log('🌱 Starting database seeding...');

    // Get seeders
    const superAdminSeeder = app.get(SuperAdminSeeder);

    // Run seeders
    console.log('📝 Seeding super admins...');
    await superAdminSeeder.seed();

    console.log('✅ Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();