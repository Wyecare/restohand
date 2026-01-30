import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { MenuCategory, MenuCategorySchema } from '../menu-categories/schemas/menu-category.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { RestaurantTable, RestaurantTableSchema } from '../restaurant-tables/schemas/restaurant-table.schema';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { OrdersModule } from '../orders/orders.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { CustomerSessionsModule } from '../customer-sessions/customer-sessions.module';
import { GstModule } from '../gst/gst.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: MenuCategory.name, schema: MenuCategorySchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Order.name, schema: OrderSchema },
      { name: RestaurantTable.name, schema: RestaurantTableSchema },
    ]),
    OrdersModule,
    RestaurantsModule,
    CustomerSessionsModule,
    GstModule,
  ],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
