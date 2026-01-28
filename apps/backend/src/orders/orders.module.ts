import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { RestaurantTablesModule } from '../restaurant-tables/restaurant-tables.module';
import { OrdersController } from './orders.controller';
import { PublicOrdersController } from './public-orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { OrderEvent, OrderEventSchema } from './schemas/order-event.schema';
import { OrdersGateway } from './orders.gateway';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { RestaurantTable, RestaurantTableSchema } from '../restaurant-tables/schemas/restaurant-table.schema';
import { OrderCounter, OrderCounterSchema } from './schemas/order-counter.schema';
import { OrderModification, OrderModificationSchema } from './schemas/order-modification.schema';
import { OrderModificationController } from './order-modification.controller';
import { OrderModificationService } from './order-modification.service';
import { GstModule } from '../gst/gst.module';
import { RazorpayService } from '../payments/razorpay.service';
import { WebhooksController } from '../payments/webhooks.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    AuthModule,
    GstModule,
    RestaurantsModule,
    RestaurantTablesModule,
    SubscriptionsModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: OrderEvent.name, schema: OrderEventSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: RestaurantTable.name, schema: RestaurantTableSchema },
      { name: OrderCounter.name, schema: OrderCounterSchema },
      { name: OrderModification.name, schema: OrderModificationSchema },
    ]),
  ],
  controllers: [OrdersController, PublicOrdersController, OrderModificationController, WebhooksController],
  providers: [OrdersService, OrderModificationService, OrdersGateway, RazorpayService],
  exports: [OrdersService, OrderModificationService],
})
export class OrdersModule {}
