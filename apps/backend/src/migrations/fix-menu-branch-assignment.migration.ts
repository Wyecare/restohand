import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Branch, BranchDocument } from '../branches/schemas/branch.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { MenuCategory, MenuCategoryDocument } from '../menu-categories/schemas/menu-category.schema';

@Injectable()
export class FixMenuBranchAssignmentMigration {
  private readonly logger = new Logger(FixMenuBranchAssignmentMigration.name);

  constructor(
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(MenuCategory.name) private menuCategoryModel: Model<MenuCategoryDocument>,
  ) {}

  async execute(): Promise<void> {
    this.logger.log('Starting menu branch assignment migration...');

    try {
      // Step 1: Update menu items without branchId
      await this.updateMenuItemsWithBranch();

      // Step 2: Update menu categories without branchId
      await this.updateMenuCategoriesWithBranch();

      this.logger.log('Menu branch assignment migration completed successfully');
    } catch (error) {
      this.logger.error('Menu branch assignment migration failed:', error);
      throw error;
    }
  }

  private async updateMenuItemsWithBranch(): Promise<void> {
    this.logger.log('Updating menu items with default branch...');

    // Find all menu items without branchId
    const menuItems = await this.menuItemModel.find({ branchId: { $exists: false } }).exec();
    let updatedCount = 0;

    for (const item of menuItems) {
      // Find the main branch for this restaurant
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
      } else {
        this.logger.warn(`No main branch found for restaurant ${item.restaurantId}, menu item ${item._id} not updated`);
      }
    }

    this.logger.log(`Updated ${updatedCount} menu items with branch assignment`);
  }

  private async updateMenuCategoriesWithBranch(): Promise<void> {
    this.logger.log('Updating menu categories with default branch...');

    // Find all menu categories without branchId
    const menuCategories = await this.menuCategoryModel.find({ branchId: { $exists: false } }).exec();
    let updatedCount = 0;

    for (const category of menuCategories) {
      // Find the main branch for this restaurant
      const mainBranch = await this.branchModel.findOne({
        restaurantId: category.restaurantId,
        isMainBranch: true,
      }).exec();

      if (mainBranch) {
        await this.menuCategoryModel.updateOne(
          { _id: category._id },
          { branchId: mainBranch._id }
        );
        updatedCount++;
      } else {
        this.logger.warn(`No main branch found for restaurant ${category.restaurantId}, menu category ${category._id} not updated`);
      }
    }

    this.logger.log(`Updated ${updatedCount} menu categories with branch assignment`);
  }

  async rollback(): Promise<void> {
    this.logger.log('Rolling back menu branch assignment migration...');

    // Remove branchId from menu items and categories
    await Promise.all([
      this.menuItemModel.updateMany({}, { $unset: { branchId: 1 } }),
      this.menuCategoryModel.updateMany({}, { $unset: { branchId: 1 } }),
    ]);

    this.logger.log('Menu branch assignment rollback completed');
  }
}