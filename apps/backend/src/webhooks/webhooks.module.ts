import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { RazorpayService } from '../payments/razorpay.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { OrdersModule } from '../orders/orders.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';

@Module({
  imports: [
    SubscriptionsModule,
    OrdersModule,
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
  ],
  controllers: [WebhooksController],
  providers: [RazorpayService],
})
export class WebhooksModule {}