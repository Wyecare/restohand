import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from '../config/app.config';
import { databaseConfig } from '../config/database.config';
import { envValidationSchema } from '../config/env.validation';
import { firebaseConfig } from '../config/firebase.config';
import { DatabaseModule } from '../database/database.module';
import { HealthModule } from '../health/health.module';
import { MenuCategoriesModule } from '../menu-categories/menu-categories.module';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { OrdersModule } from '../orders/orders.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { AuthModule } from '../auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, firebaseConfig],
      validationSchema: envValidationSchema,
      expandVariables: true,
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    RestaurantsModule,
    MenuCategoriesModule,
    MenuItemsModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
