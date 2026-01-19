import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RestaurantTable, RestaurantTableSchema } from './schemas/restaurant-table.schema';
import { TableStatus, TableStatusSchema } from './schemas/table-status.schema';
import { Zone, ZoneSchema } from './schemas/zone.schema';
import { RestaurantTablesService } from './restaurant-tables.service';
import { TableStatusService } from './table-status.service';
import { ZoneManagementService } from './zone-management.service';
import { RestaurantTablesController } from './restaurant-tables.controller';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    RestaurantsModule,
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: RestaurantTable.name, schema: RestaurantTableSchema },
      { name: TableStatus.name, schema: TableStatusSchema },
      { name: Zone.name, schema: ZoneSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [RestaurantTablesService, TableStatusService, ZoneManagementService],
  controllers: [RestaurantTablesController],
  exports: [RestaurantTablesService, TableStatusService, ZoneManagementService],
})
export class RestaurantTablesModule {}
