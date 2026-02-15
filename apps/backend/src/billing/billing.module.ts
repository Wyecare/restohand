import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingController } from './billing.controller';
import { BillCalculatorService } from './services/bill-calculator.service';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { CustomerSession, CustomerSessionSchema } from '../customer-sessions/schemas/customer-session.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { MenuCategory, MenuCategorySchema } from '../menu-categories/schemas/menu-category.schema';
import { AuthModule } from '../auth/auth.module';
import { GstModule } from '../gst/gst.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: CustomerSession.name, schema: CustomerSessionSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: MenuCategory.name, schema: MenuCategorySchema },
    ]),
    forwardRef(() => AuthModule),
    GstModule,
  ],
  controllers: [BillingController],
  providers: [BillCalculatorService],
  exports: [BillCalculatorService],
})
export class BillingModule {}