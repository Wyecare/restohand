import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { RazorpayService } from '../payments/razorpay.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
  ],
  controllers: [WebhooksController],
  providers: [RazorpayService, SubscriptionsService],
})
export class WebhooksModule {}