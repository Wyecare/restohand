import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController, AdminSubscriptionsController } from './subscriptions.controller';
import { CashfreeSubscriptionService } from './cashfree-subscription.service';
import { CashfreeSubscriptionController } from './cashfree-subscription.controller';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { CashfreeSubscription, CashfreeSubscriptionSchema } from './schemas/cashfree-subscription.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../subscription-plans/schemas/subscription-plan.schema';
import { RazorpayService } from '../payments/razorpay.service';
import { CashfreeService } from '../payments/cashfree.service';

@Module({
  imports: [
    AuthModule,
    ScheduleModule.forRoot(), // Enable cron jobs
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: CashfreeSubscription.name, schema: CashfreeSubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
    ]),
  ],
  controllers: [
    SubscriptionsController,
    AdminSubscriptionsController,
    CashfreeSubscriptionController,
  ],
  providers: [
    SubscriptionsService,
    RazorpayService,
    CashfreeSubscriptionService,
    CashfreeService,
  ],
  exports: [SubscriptionsService, CashfreeSubscriptionService],
})
export class SubscriptionsModule {}