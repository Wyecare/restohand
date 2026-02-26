import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

// Controllers
import { InventoryController } from './inventory.controller';
import { SuppliersController } from './suppliers.controller';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { TransferOrdersController } from './transfer-orders.controller';
import { InventoryCountsController } from './inventory-counts.controller';

// Services
import { InventoryService } from './inventory.service';
import { SuppliersService } from './suppliers.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import { TransferOrdersService } from './transfer-orders.service';
import { InventoryCountsService } from './inventory-counts.service';

// Schemas
import { InventoryItem, InventoryItemSchema } from './schemas/inventory-item.schema';
import { StockMovement, StockMovementSchema } from './schemas/stock-movement.schema';
import { StockAlert, StockAlertSchema } from './schemas/stock-alert.schema';
import { Supplier, SupplierSchema } from './schemas/supplier.schema';
import { PurchaseOrder, PurchaseOrderSchema } from './schemas/purchase-order.schema';
import { TransferOrder, TransferOrderSchema } from './schemas/transfer-order.schema';
import { InventoryCount, InventoryCountSchema } from './schemas/inventory-count.schema';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      // Existing schemas
      { name: InventoryItem.name, schema: InventoryItemSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: StockAlert.name, schema: StockAlertSchema },
      // New schemas
      { name: Supplier.name, schema: SupplierSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: TransferOrder.name, schema: TransferOrderSchema },
      { name: InventoryCount.name, schema: InventoryCountSchema },
    ]),
  ],
  controllers: [
    InventoryController,
    SuppliersController,
    PurchaseOrdersController,
    TransferOrdersController,
    InventoryCountsController,
  ],
  providers: [
    // Core inventory service
    InventoryService,
    // New services
    SuppliersService,
    PurchaseOrdersService,
    TransferOrdersService,
    InventoryCountsService,
  ],
  exports: [
    InventoryService,
    SuppliersService,
    PurchaseOrdersService,
    TransferOrdersService,
    InventoryCountsService,
  ],
})
export class InventoryModule {}