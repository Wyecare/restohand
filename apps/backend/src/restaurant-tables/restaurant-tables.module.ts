import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { AuthModule } from '../auth/auth.module';
import { RestaurantTable, RestaurantTableSchema } from './schemas/restaurant-table.schema';
import { RestaurantTablesService } from './restaurant-tables.service';
import { RestaurantTablesController } from './restaurant-tables.controller';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    RestaurantsModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: RestaurantTable.name, schema: RestaurantTableSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  providers: [RestaurantTablesService],
  controllers: [RestaurantTablesController],
  exports: [RestaurantTablesService],
})
export class RestaurantTablesModule {}
