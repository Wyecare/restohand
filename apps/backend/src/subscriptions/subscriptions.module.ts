import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController, AdminSubscriptionsController } from './subscriptions.controller';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { RazorpayService } from '../payments/razorpay.service';

@Module({
  imports: [
    AuthModule,
    ScheduleModule.forRoot(), // Enable cron jobs
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
  ],
  controllers: [SubscriptionsController, AdminSubscriptionsController],
  providers: [SubscriptionsService, RazorpayService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}