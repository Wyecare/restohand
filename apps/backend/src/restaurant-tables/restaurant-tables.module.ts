import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { GstModule } from '../gst/gst.module';
import { RestaurantTable, RestaurantTableSchema } from './schemas/restaurant-table.schema';
import { TableStatus, TableStatusSchema } from './schemas/table-status.schema';
import { Zone, ZoneSchema } from './schemas/zone.schema';
import { RestaurantTablesService } from './restaurant-tables.service';
import { TableStatusService } from './table-status.service';
import { ZoneManagementService } from './zone-management.service';
import { RestaurantTablesController } from './restaurant-tables.controller';
import { TableHeatmapSSEController } from './table-heatmap-sse.controller';
import { TableStatusGateway } from './table-status.gateway';
import { TableStatusSSEService } from './table-status-sse.service';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    forwardRef(() => RestaurantsModule), // Break circular dependency
    AuthModule,
    GstModule, // Import GstModule for SmartGstService
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
    forwardRef(() => UsersModule), // Break circular dependency
    MongooseModule.forFeature([
      { name: RestaurantTable.name, schema: RestaurantTableSchema },
      { name: TableStatus.name, schema: TableStatusSchema },
      { name: Zone.name, schema: ZoneSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [RestaurantTablesService, TableStatusService, ZoneManagementService, TableStatusGateway, TableStatusSSEService],
  controllers: [RestaurantTablesController, TableHeatmapSSEController],
  exports: [RestaurantTablesService, TableStatusService, ZoneManagementService, TableStatusSSEService],
})
export class RestaurantTablesModule {}
