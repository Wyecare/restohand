import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

// Import services
import { CashfreeService } from './cashfree.service';
import { CashfreeVendorService } from './cashfree-vendor.service';
import { CashfreePaymentService } from './cashfree-payment.service';

// Import controllers
import { CashfreeWebhooksController } from './cashfree-webhooks.controller';
import { CashfreeOrdersController } from './cashfree-orders.controller';
import { CashfreePublicController } from './cashfree-public.controller';

// Import schemas
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

// Import config
import { cashfreeConfig } from '../config/cashfree.config';

// Note: OrdersService comes from OrdersModule import

// Import AuthModule for JWT guards
import { AuthModule } from '../auth/auth.module';

// Import OrdersModule for OrdersService
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    ConfigModule.forFeature(cashfreeConfig),
    AuthModule, // Import AuthModule for JWT guards
    forwardRef(() => OrdersModule), // Import OrdersModule for OrdersService
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  providers: [
    CashfreeService,
    CashfreeVendorService,
    CashfreePaymentService,
    // Note: OrdersService comes from OrdersModule import
  ],
  controllers: [
    CashfreeWebhooksController,
    CashfreeOrdersController,
    CashfreePublicController,
  ],
  exports: [
    CashfreeService,
    CashfreeVendorService,
    CashfreePaymentService,
  ],
})
export class CashfreeModule {}