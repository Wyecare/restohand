import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { AuthModule } from '../auth/auth.module';
import { RestaurantTable, RestaurantTableSchema } from './schemas/restaurant-table.schema';
import { RestaurantTablesService } from './restaurant-tables.service';
import { RestaurantTablesController } from './restaurant-tables.controller';

@Module({
  imports: [
    RestaurantsModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: RestaurantTable.name, schema: RestaurantTableSchema },
    ]),
  ],
  providers: [RestaurantTablesService],
  controllers: [RestaurantTablesController],
  exports: [RestaurantTablesService],
})
export class RestaurantTablesModule {}
