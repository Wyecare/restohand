import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DemoController } from './demo.controller';
import { RestaurantTablesModule } from '../restaurant-tables/restaurant-tables.module';
import { RestaurantTableSchema } from '../restaurant-tables/schemas/restaurant-table.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'RestaurantTable', schema: RestaurantTableSchema }
    ]),
    RestaurantTablesModule
  ],
  controllers: [DemoController],
})
export class DemoModule {}