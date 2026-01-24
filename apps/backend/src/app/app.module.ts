import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { appConfig } from '../config/app.config';
import { databaseConfig } from '../config/database.config';
import { envValidationSchema } from '../config/env.validation';
import { firebaseConfig } from '../config/firebase.config';
import { razorpayConfig } from '../config/razorpay.config';
import { DatabaseModule } from '../database/database.module';
import { HealthModule } from '../health/health.module';
import { MenuCategoriesModule } from '../menu-categories/menu-categories.module';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { OrdersModule } from '../orders/orders.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { PublicModule } from '../public/public.module';
import { RestaurantTablesModule } from '../restaurant-tables/restaurant-tables.module';
import { GstModule } from '../gst/gst.module';
import { FloorPlansModule } from '../floor-plans/floor-plans.module';
import { InventoryModule } from '../inventory/inventory.module';
import { RecipesModule } from '../recipes/recipes.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { StaffModule } from '../staff/staff.module';
import { ReportsModule } from '../reports/reports.module';
import { MenuExtractionModule } from '../menu-extraction/menu-extraction.module';
import { CallWaiterModule } from '../call-waiter/call-waiter.module';
import { BranchesModule } from '../branches/branches.module';
import { MigrationModule } from '../migrations/migration.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, firebaseConfig, razorpayConfig],
      validationSchema: envValidationSchema,
      expandVariables: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // Default limit for all endpoints
    }]),
    DatabaseModule,
    AuthModule,
    HealthModule,
    UsersModule,
    RestaurantsModule,
    PublicModule,
    MenuCategoriesModule,
    MenuItemsModule,
    OrdersModule,
    RestaurantTablesModule,
    GstModule,
    FloorPlansModule,
    SubscriptionsModule,
    InventoryModule,
    RecipesModule,
    StaffModule,
    ReportsModule,
    MenuExtractionModule,
    CallWaiterModule,
    BranchesModule,
    MigrationModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
