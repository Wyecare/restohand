import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionPlansModule } from '../subscription-plans/subscription-plans.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    AuthModule,
    SubscriptionPlansModule,
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}