import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MigrationController } from './migration.controller';
import { CreateDefaultBranchesMigration } from './create-default-branches.migration';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { InventoryItem, InventoryItemSchema } from '../inventory/schemas/inventory-item.schema';
import { StockMovement, StockMovementSchema } from '../inventory/schemas/stock-movement.schema';
import { RestaurantTable, RestaurantTableSchema } from '../restaurant-tables/schemas/restaurant-table.schema';
import { EnhancedMenuItem, EnhancedMenuItemSchema } from '../menu-items/schemas/enhanced-menu-item.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: InventoryItem.name, schema: InventoryItemSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: RestaurantTable.name, schema: RestaurantTableSchema },
      { name: EnhancedMenuItem.name, schema: EnhancedMenuItemSchema },
    ]),
    AuthModule,
  ],
  controllers: [MigrationController],
  providers: [CreateDefaultBranchesMigration],
  exports: [CreateDefaultBranchesMigration],
})
export class MigrationModule {}