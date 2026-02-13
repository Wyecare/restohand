import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSessionsController } from './customer-sessions.controller';
import { CustomerSessionsService } from './customer-sessions.service';
import { CustomerSession, CustomerSessionSchema } from './schemas/customer-session.schema';
import { SessionHistory, SessionHistorySchema } from './schemas/session-history.schema';
import { RestaurantTable, RestaurantTableSchema } from '../restaurant-tables/schemas/restaurant-table.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerSession.name, schema: CustomerSessionSchema },
      { name: SessionHistory.name, schema: SessionHistorySchema },
      { name: RestaurantTable.name, schema: RestaurantTableSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    BillingModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [CustomerSessionsController],
  providers: [CustomerSessionsService],
  exports: [CustomerSessionsService],
})
export class CustomerSessionsModule {}