import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
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
import { OrdersSSEController } from './orders-sse.controller';
import { OrdersSSEService } from './orders-sse.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { RestaurantTable, RestaurantTableSchema } from '../restaurant-tables/schemas/restaurant-table.schema';
import { OrderCounter, OrderCounterSchema } from './schemas/order-counter.schema';
import { OrderModification, OrderModificationSchema } from './schemas/order-modification.schema';
import { ReceiptDocument, ReceiptDocumentSchema } from './schemas/receipt-document.schema';
import { OrderModificationController } from './order-modification.controller';
import { OrderModificationService } from './order-modification.service';
import { ReceiptDocumentService } from './receipt-document.service';
import { GstModule } from '../gst/gst.module';
import { RazorpayService } from '../payments/razorpay.service';
import { WebhooksController } from '../payments/webhooks.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    AuthModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
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
      { name: ReceiptDocument.name, schema: ReceiptDocumentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [OrdersController, PublicOrdersController, OrderModificationController, WebhooksController, OrdersSSEController],
  providers: [OrdersService, OrderModificationService, ReceiptDocumentService, OrdersGateway, OrdersSSEService, RazorpayService],
  exports: [OrdersService, OrderModificationService, ReceiptDocumentService],
})
export class OrdersModule {}
