import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CallWaiterController } from './call-waiter.controller';
import { CallWaiterService } from './call-waiter.service';
import { CallWaiterGateway } from './call-waiter.gateway';
import { FCMNotificationService } from './fcm-notification.service';
import { CallWaiter, CallWaiterSchema } from './schemas/call-waiter.schema';
import { TableStatus, TableStatusSchema } from '../floor-plans/schemas/table-status.schema';
import { RestaurantTable, RestaurantTableSchema } from '../restaurant-tables/schemas/restaurant-table.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CallWaiter.name, schema: CallWaiterSchema },
      { name: TableStatus.name, schema: TableStatusSchema },
      { name: RestaurantTable.name, schema: RestaurantTableSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    AuthModule,
  ],
  controllers: [CallWaiterController],
  providers: [CallWaiterService, CallWaiterGateway, FCMNotificationService],
  exports: [CallWaiterService, CallWaiterGateway, FCMNotificationService],
})
export class CallWaiterModule {}