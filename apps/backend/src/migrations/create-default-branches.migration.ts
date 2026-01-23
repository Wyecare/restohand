import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { Branch, BranchDocument } from '../branches/schemas/branch.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { InventoryItem, InventoryItemDocument } from '../inventory/schemas/inventory-item.schema';
import { StockMovement, StockMovementDocument } from '../inventory/schemas/stock-movement.schema';
import { RestaurantTable, RestaurantTableDocument } from '../restaurant-tables/schemas/restaurant-table.schema';
import { EnhancedMenuItem, EnhancedMenuItemDocument } from '../menu-items/schemas/enhanced-menu-item.schema';

@Injectable()
export class CreateDefaultBranchesMigration {
  private readonly logger = new Logger(CreateDefaultBranchesMigration.name);

  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(InventoryItem.name) private inventoryModel: Model<InventoryItemDocument>,
    @InjectModel(StockMovement.name) private stockMovementModel: Model<StockMovementDocument>,
    @InjectModel(RestaurantTable.name) private tableModel: Model<RestaurantTableDocument>,
    @InjectModel(EnhancedMenuItem.name) private menuItemModel: Model<EnhancedMenuItemDocument>,
  ) {}

  async execute(): Promise<void> {
    this.logger.log('Starting default branch creation migration...');

    try {
      // Step 1: Create default branches for all restaurants
      await this.createDefaultBranches();

      // Step 2: Update all users with default branch
      await this.updateUsersWithBranch();

      // Step 3: Update all orders with default branch
      await this.updateOrdersWithBranch();

      // Step 4: Update all inventory items with default branch
      await this.updateInventoryWithBranch();

      // Step 5: Update all stock movements with default branch
      await this.updateStockMovementsWithBranch();

      // Step 6: Update all tables with default branch
      await this.updateTablesWithBranch();

      // Step 7: Update all menu items with default branch
      await this.updateMenuItemsWithBranch();

      this.logger.log('Migration completed successfully');
    } catch (error) {
      this.logger.error('Migration failed:', error);
      throw error;
    }
  }

  private async createDefaultBranches(): Promise<void> {
    this.logger.log('Creating default branches for restaurants...');

    const restaurants = await this.restaurantModel.find({}).exec();
    let createdCount = 0;

    for (const restaurant of restaurants) {
      // Check if restaurant already has branches
      const existingBranches = await this.branchModel.find({
        restaurantId: restaurant._id.toString(),
      }).exec();

      if (existingBranches.length === 0) {
        // Create default main branch
        const defaultBranch = new this.branchModel({
          restaurantId: restaurant._id,
          name: 'Main Branch',
          slug: 'main',
          description: `Main branch of ${restaurant.name}`,
          address: restaurant.address || {
            line1: 'Main Location',
            city: 'City',
            state: 'State',
            postalCode: '000000',
            country: 'IN',
          },
          contactPhone: restaurant.contactPhone,
          contactEmail: restaurant.contactEmail,
          isMainBranch: true,
          isActive: true,
          settings: {
            orderNumberPrefix: restaurant.settings?.orderNumberPrefix || 'ORD',
            enableTakeout: true,
            enableDineIn: true,
            enableDelivery: false,
          },
        });

        await defaultBranch.save();
        createdCount++;

        // Update restaurant to enable multi-branch
        await this.restaurantModel.updateOne(
          { _id: restaurant._id },
          {
            isMultibranchEnabled: true,
            branchCount: 1,
          }
        );
      }
    }

    this.logger.log(`Created ${createdCount} default branches`);
  }

  private async updateUsersWithBranch(): Promise<void> {
    this.logger.log('Updating users with default branch...');

    const users = await this.userModel.find({ branchId: { $exists: false } }).exec();
    let updatedCount = 0;

    for (const user of users) {
      const mainBranch = await this.branchModel.findOne({
        restaurantId: user.restaurantId,
        isMainBranch: true,
      }).exec();

      if (mainBranch) {
        await this.userModel.updateOne(
          { _id: user._id },
          { branchId: mainBranch._id }
        );
        updatedCount++;
      }
    }

    this.logger.log(`Updated ${updatedCount} users with branch`);
  }

  private async updateOrdersWithBranch(): Promise<void> {
    this.logger.log('Updating orders with default branch...');

    // Process in batches for memory efficiency
    const batchSize = 1000;
    let skip = 0;
    let totalUpdated = 0;

    while (true) {
      const orders = await this.orderModel
        .find({ branchId: { $exists: false } })
        .skip(skip)
        .limit(batchSize)
        .exec();

      if (orders.length === 0) break;

      const bulkOps = [];

      for (const order of orders) {
        const mainBranch = await this.branchModel.findOne({
          restaurantId: order.restaurantId,
          isMainBranch: true,
        }).exec();

        if (mainBranch) {
          bulkOps.push({
            updateOne: {
              filter: { _id: order._id },
              update: { branchId: mainBranch._id },
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await this.orderModel.bulkWrite(bulkOps);
        totalUpdated += bulkOps.length;
      }

      skip += batchSize;
    }

    this.logger.log(`Updated ${totalUpdated} orders with branch`);
  }

  private async updateInventoryWithBranch(): Promise<void> {
    this.logger.log('Updating inventory items with default branch...');

    const items = await this.inventoryModel.find({ branchId: { $exists: false } }).exec();
    let updatedCount = 0;

    for (const item of items) {
      const mainBranch = await this.branchModel.findOne({
        restaurantId: item.restaurantId,
        isMainBranch: true,
      }).exec();

      if (mainBranch) {
        await this.inventoryModel.updateOne(
          { _id: item._id },
          { branchId: mainBranch._id }
        );
        updatedCount++;
      }
    }

    this.logger.log(`Updated ${updatedCount} inventory items with branch`);
  }

  private async updateStockMovementsWithBranch(): Promise<void> {
    this.logger.log('Updating stock movements with default branch...');

    const movements = await this.stockMovementModel.find({ branchId: { $exists: false } }).exec();
    let updatedCount = 0;

    for (const movement of movements) {
      const mainBranch = await this.branchModel.findOne({
        restaurantId: movement.restaurantId,
        isMainBranch: true,
      }).exec();

      if (mainBranch) {
        await this.stockMovementModel.updateOne(
          { _id: movement._id },
          { branchId: mainBranch._id }
        );
        updatedCount++;
      }
    }

    this.logger.log(`Updated ${updatedCount} stock movements with branch`);
  }

  private async updateTablesWithBranch(): Promise<void> {
    this.logger.log('Updating tables with default branch...');

    const tables = await this.tableModel.find({ branchId: { $exists: false } }).exec();
    let updatedCount = 0;

    for (const table of tables) {
      const mainBranch = await this.branchModel.findOne({
        restaurantId: table.restaurantId,
        isMainBranch: true,
      }).exec();

      if (mainBranch) {
        await this.tableModel.updateOne(
          { _id: table._id },
          { branchId: mainBranch._id }
        );
        updatedCount++;
      }
    }

    this.logger.log(`Updated ${updatedCount} tables with branch`);
  }

  private async updateMenuItemsWithBranch(): Promise<void> {
    this.logger.log('Updating menu items with default branch...');

    const menuItems = await this.menuItemModel.find({ branchId: { $exists: false } }).exec();
    let updatedCount = 0;

    for (const item of menuItems) {
      const mainBranch = await this.branchModel.findOne({
        restaurantId: item.restaurantId,
        isMainBranch: true,
      }).exec();

      if (mainBranch) {
        await this.menuItemModel.updateOne(
          { _id: item._id },
          { branchId: mainBranch._id }
        );
        updatedCount++;
      }
    }

    this.logger.log(`Updated ${updatedCount} menu items with branch`);
  }

  async rollback(): Promise<void> {
    this.logger.log('Rolling back migration...');

    // Remove branchId from all documents
    await Promise.all([
      this.userModel.updateMany({}, { $unset: { branchId: 1 } }),
      this.orderModel.updateMany({}, { $unset: { branchId: 1 } }),
      this.inventoryModel.updateMany({}, { $unset: { branchId: 1 } }),
      this.stockMovementModel.updateMany({}, { $unset: { branchId: 1 } }),
      this.tableModel.updateMany({}, { $unset: { branchId: 1 } }),
      this.menuItemModel.updateMany({}, { $unset: { branchId: 1 } }),
    ]);

    // Remove all branches
    await this.branchModel.deleteMany({});

    // Reset restaurant multi-branch settings
    await this.restaurantModel.updateMany(
      {},
      {
        isMultibranchEnabled: false,
        branchCount: 1,
      }
    );

    this.logger.log('Rollback completed');
  }
}