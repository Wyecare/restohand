import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSession, CustomerSessionSchema } from '../customer-sessions/schemas/customer-session.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { AuthModule } from '../auth/auth.module';
import { RestaurantSessionsController, RestaurantOrdersController } from './restaurant-sessions.controller';
import { RestaurantSessionsService } from './restaurant-sessions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerSession.name, schema: CustomerSessionSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [RestaurantSessionsController, RestaurantOrdersController],
  providers: [RestaurantSessionsService],
  exports: [RestaurantSessionsService],
})
export class RestaurantSessionsModule {}