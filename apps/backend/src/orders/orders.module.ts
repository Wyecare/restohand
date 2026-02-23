import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { RestaurantTablesModule } from '../restaurant-tables/restaurant-tables.module';
import { CallWaiterModule } from '../call-waiter/call-waiter.module';
import { OrdersController } from './orders.controller';
import { PublicOrdersController } from './public-orders.controller';
import { OrdersService } from './orders.service';
import { PaymentNotificationService } from './payment-notification.service';
import { Order, OrderSchema } from './schemas/order.schema';
import {
  Restaurant,
  RestaurantSchema,
} from '../restaurants/schemas/restaurant.schema';
import { OrderEvent, OrderEventSchema } from './schemas/order-event.schema';
import { OrdersGateway } from './orders.gateway';
import { OrdersSSEController } from './orders-sse.controller';
import { OrdersSSEService } from './orders-sse.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  MenuItem,
  MenuItemSchema,
} from '../menu-items/schemas/menu-item.schema';
import {
  RestaurantTable,
  RestaurantTableSchema,
} from '../restaurant-tables/schemas/restaurant-table.schema';
import {
  OrderCounter,
  OrderCounterSchema,
} from './schemas/order-counter.schema';
import {
  OrderModification,
  OrderModificationSchema,
} from './schemas/order-modification.schema';
import {
  ReceiptDocument,
  ReceiptDocumentSchema,
} from './schemas/receipt-document.schema';
import { OrderModificationController } from './order-modification.controller';
import { OrderModificationService } from './order-modification.service';
import { ReceiptDocumentService } from './receipt-document.service';
import { GstModule } from '../gst/gst.module';
import { RazorpayService } from '../payments/razorpay.service';
import { WebhooksController } from '../payments/webhooks.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MenuPriceTagsModule } from '../menu-price-tags/menu-price-tags.module';
import { MenuModifiersModule } from '../menu-modifiers/menu-modifiers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CustomerSessionsModule } from '../customer-sessions/customer-sessions.module';
import { BillingModule } from '../billing/billing.module';
import { CustomerSession, CustomerSessionSchema } from '../customer-sessions/schemas/customer-session.schema';
import { PublicModule } from '../public/public.module';

@Module({
  imports: [
    AuthModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret:
          process.env.JWT_SECRET ||
          'your-super-secret-jwt-key-change-this-in-production',
        signOptions: {
          expiresIn: process.env.JWT_ACCESS_TTL || '30d',
        },
      }),
    }),
    GstModule,
    forwardRef(() => RestaurantsModule), // Break circular dependency
    forwardRef(() => RestaurantTablesModule), // Break circular dependency
    CallWaiterModule,
    SubscriptionsModule,
    MenuPriceTagsModule,
    MenuModifiersModule,
    NotificationsModule,
    CustomerSessionsModule,
    BillingModule,
    forwardRef(() => PublicModule),
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
      { name: CustomerSession.name, schema: CustomerSessionSchema },
    ]),
  ],
  controllers: [
    OrdersController,
    PublicOrdersController,
    OrderModificationController,
    WebhooksController,
    OrdersSSEController,
  ],
  providers: [
    OrdersService,
    OrderModificationService,
    ReceiptDocumentService,
    PaymentNotificationService,
    OrdersGateway,
    OrdersSSEService,
    RazorpayService,
  ],
  exports: [
    OrdersService,
    OrderModificationService,
    ReceiptDocumentService,
    PaymentNotificationService,
  ],
})
export class OrdersModule {}
