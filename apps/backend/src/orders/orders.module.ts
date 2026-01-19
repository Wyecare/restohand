import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { OrderEvent, OrderEventSchema } from './schemas/order-event.schema';
import { OrdersGateway } from './orders.gateway';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { OrderCounter, OrderCounterSchema } from './schemas/order-counter.schema';
import { GstModule } from '../gst/gst.module';
import { RazorpayService } from '../payments/razorpay.service';
import { WebhooksController } from '../payments/webhooks.controller';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Module({
  imports: [
    AuthModule,
    GstModule,
    RestaurantsModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: OrderEvent.name, schema: OrderEventSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: OrderCounter.name, schema: OrderCounterSchema },
    ]),
  ],
  controllers: [OrdersController, WebhooksController],
  providers: [OrdersService, OrdersGateway, RazorpayService, SubscriptionsService],
  exports: [OrdersService],
})
export class OrdersModule {}
