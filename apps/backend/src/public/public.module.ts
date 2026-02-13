import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { MenuCategory, MenuCategorySchema } from '../menu-categories/schemas/menu-category.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { MenuModifier, MenuModifierSchema } from '../menu-modifiers/schemas/menu-modifier.schema';
import { MenuPriceTag, MenuPriceTagSchema } from '../menu-price-tags/schemas/menu-price-tag.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { RestaurantTable, RestaurantTableSchema } from '../restaurant-tables/schemas/restaurant-table.schema';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { OrdersModule } from '../orders/orders.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { CustomerSessionsModule } from '../customer-sessions/customer-sessions.module';
import { BillingModule } from '../billing/billing.module';
import { GstModule } from '../gst/gst.module';
import { CashfreeModule } from '../payments/cashfree.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: MenuCategory.name, schema: MenuCategorySchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: MenuModifier.name, schema: MenuModifierSchema },
      { name: MenuPriceTag.name, schema: MenuPriceTagSchema },
      { name: Order.name, schema: OrderSchema },
      { name: RestaurantTable.name, schema: RestaurantTableSchema },
    ]),
    forwardRef(() => OrdersModule),
    RestaurantsModule,
    CustomerSessionsModule,
    BillingModule,
    GstModule,
    CashfreeModule,
  ],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
