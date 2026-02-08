import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CreateMenuItemDto } from './dtos/create-menu-item.dto';
import { MenuItemListResponseDto } from './dtos/menu-item-list-response.dto';
import { MenuItemResponseDto } from './dtos/menu-item-response.dto';
import { QueryMenuItemsDto } from './dtos/query-menu-items.dto';
import { UpdateMenuItemDto } from './dtos/update-menu-item.dto';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';
import { PaginationUtil } from '../common/utils/pagination.util';
import { GstRate, GstRateDocument } from '../gst/schemas/gst-rate.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { Recipe, RecipeDocument } from '../recipes/schemas/recipe.schema';
import { SmartGstService } from '../gst/smart-gst.service';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItemDocument>,
    @InjectModel(GstRate.name)
    private readonly gstRateModel: Model<GstRateDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Recipe.name)
    private readonly recipeModel: Model<RecipeDocument>,
    private readonly smartGstService: SmartGstService
  ) {}

  async create(
    restaurantId: string,
    dto: CreateMenuItemDto
  ): Promise<MenuItemResponseDto> {
    const restaurant = await this.restaurantModel
      .findById(restaurantId)
      .lean();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    // Use smart GST auto-configuration
    const gstConfig = await this.smartGstService.autoConfigureMenuItemGst({
      name: dto.name,
      description: dto.description,
      restaurantId
    });

    // Allow manual overrides from DTO
    const finalGstConfig = {
      ...gstConfig,
      foodCategory: dto.foodCategory || gstConfig.foodCategory,
      gstRate: dto.overrideGstRate !== undefined ? dto.overrideGstRate : gstConfig.gstRate,
      overrideGstRate: dto.overrideGstRate,
    };

    // Calculate dietary information from ingredients
    const dietaryInfo = this.calculateDietaryInfo(dto.ingredients || []);

    const created = await this.menuItemModel.create({
      ...dto,
      restaurantId,
      // Smart GST fields
      foodCategory: finalGstConfig.foodCategory,
      hsnCode: finalGstConfig.hsnCode,
      gstRate: finalGstConfig.gstRate,
      overrideGstRate: finalGstConfig.overrideGstRate,
      exemptFromGst: finalGstConfig.exemptFromGst,
      useStateVat: finalGstConfig.useStateVat,
      categoryConfidence: finalGstConfig.categoryConfidence,
      // Dietary information (computed from ingredients)
      ...dietaryInfo,
    });
    return this.toDto(created);
  }

  async findByBranch(
    restaurantId: string,
    branchId: string,
    query: QueryMenuItemsDto
  ): Promise<MenuItemListResponseDto> {
    const { skip, limit, page } = PaginationUtil.parsePaginationOptions(query, 50);

    const filter: FilterQuery<MenuItemDocument> = { restaurantId, branchId };

    if (query.categoryId) {
      filter.categoryId = query.categoryId;
    }

    if (query.isAvailable !== undefined) {
      filter.isAvailable = query.isAvailable === 'true';
    }

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ name: regex }, { description: regex }, { tags: regex }];
    }

    // Execute queries in parallel
    const [total, items] = await Promise.all([
      this.menuItemModel.countDocuments(filter),
      this.menuItemModel
        .find(filter)
        .sort({ displayOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    const data = items.map((item) => this.toDto(item));

    return PaginationUtil.createPaginatedResponse(data, total, page, limit);
  }

  async createForBranch(
    restaurantId: string,
    branchId: string,
    dto: CreateMenuItemDto
  ): Promise<MenuItemResponseDto> {
    const restaurant = await this.restaurantModel
      .findById(restaurantId)
      .lean();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    // Use smart GST auto-configuration
    const gstConfig = await this.smartGstService.autoConfigureMenuItemGst({
      name: dto.name,
      description: dto.description,
      restaurantId
    });

    // Allow manual overrides from DTO
    const finalGstConfig = {
      ...gstConfig,
      foodCategory: dto.foodCategory || gstConfig.foodCategory,
      gstRate: dto.overrideGstRate !== undefined ? dto.overrideGstRate : gstConfig.gstRate,
      overrideGstRate: dto.overrideGstRate,
    };

    const created = await this.menuItemModel.create({
      ...dto,
      restaurantId,
      // Smart GST fields
      foodCategory: finalGstConfig.foodCategory,
      hsnCode: finalGstConfig.hsnCode,
      gstRate: finalGstConfig.gstRate,
      overrideGstRate: finalGstConfig.overrideGstRate,
      exemptFromGst: finalGstConfig.exemptFromGst,
      useStateVat: finalGstConfig.useStateVat,
      categoryConfidence: finalGstConfig.categoryConfidence,
      branchId,
    });
    return this.toDto(created);
  }

  async findAllByBranches(
    restaurantId: string,
    branchIds: string[],
    query: QueryMenuItemsDto
  ): Promise<MenuItemListResponseDto> {
    const { skip, limit, page } = PaginationUtil.parsePaginationOptions(query, 50);

    const filter: FilterQuery<MenuItemDocument> = {
      restaurantId,
      branchId: { $in: branchIds }
    };

    if (query.categoryId) {
      filter.categoryId = query.categoryId;
    }

    if (query.isAvailable !== undefined) {
      filter.isAvailable = query.isAvailable === 'true';
    }

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ name: regex }, { description: regex }, { tags: regex }];
    }

    // Execute queries in parallel
    const [total, items] = await Promise.all([
      this.menuItemModel.countDocuments(filter),
      this.menuItemModel
        .find(filter)
        .sort({ displayOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    const data = items.map((item) => this.toDto(item));

    return PaginationUtil.createPaginatedResponse(data, total, page, limit);
  }

  async findAll(
    restaurantId: string,
    query: QueryMenuItemsDto
  ): Promise<MenuItemListResponseDto> {
    const { skip, limit, page } = PaginationUtil.parsePaginationOptions(query, 50);

    const filter: FilterQuery<MenuItemDocument> = { restaurantId };

    if (query.categoryId) {
      filter.categoryId = query.categoryId;
    }

    if (query.isAvailable !== undefined) {
      filter.isAvailable = query.isAvailable === 'true';
    }

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ name: regex }, { description: regex }, { tags: regex }];
    }

    // Execute queries in parallel
    const [total, items] = await Promise.all([
      this.menuItemModel.countDocuments(filter),
      this.menuItemModel
        .find(filter)
        .sort({ displayOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    const data = items.map((item) => this.toDto(item));

    return PaginationUtil.createPaginatedResponse(data, total, page, limit);
  }

  async findOne(
    restaurantId: string,
    id: string
  ): Promise<MenuItemResponseDto> {
    const item = await this.menuItemModel.findOne({ _id: id, restaurantId });
    if (!item) {
      throw new NotFoundException(
        `Menu item ${id} not found for restaurant ${restaurantId}`
      );
    }
    return this.toDto(item);
  }

  async update(
    restaurantId: string,
    id: string,
    dto: UpdateMenuItemDto
  ): Promise<MenuItemResponseDto> {
    const updateData: Record<string, unknown> = {
      ...dto,
    };

    // Recalculate dietary information if ingredients were updated
    if (dto.ingredients) {
      const dietaryInfo = this.calculateDietaryInfo(dto.ingredients);
      Object.assign(updateData, dietaryInfo);
    }

    // Handle GST updates with smart configuration
    if (dto.foodCategory || dto.overrideGstRate !== undefined) {
      const gstConfig = await this.smartGstService.autoConfigureMenuItemGst({
        name: dto.name,
        description: dto.description,
        restaurantId,
        foodCategory: dto.foodCategory,
      });

      if (dto.overrideGstRate === undefined) {
        updateData.gstRate = gstConfig.gstRate;
        updateData.hsnCode = gstConfig.hsnCode;
        updateData.exemptFromGst = gstConfig.exemptFromGst;
        updateData.useStateVat = gstConfig.useStateVat;
        updateData.categoryConfidence = gstConfig.categoryConfidence;
      } else {
        updateData.overrideGstRate = dto.overrideGstRate;
        updateData.gstRate = dto.overrideGstRate;
      }
    }

    const updated = await this.menuItemModel.findOneAndUpdate(
      { _id: id, restaurantId },
      { $set: updateData },
      { new: true }
    );
    if (!updated) {
      throw new NotFoundException(
        `Menu item ${id} not found for restaurant ${restaurantId}`
      );
    }
    return this.toDto(updated);
  }

  async remove(restaurantId: string, id: string): Promise<void> {
    const res = await this.menuItemModel.findOneAndDelete({
      _id: id,
      restaurantId,
    });
    if (!res) {
      throw new NotFoundException(
        `Menu item ${id} not found for restaurant ${restaurantId}`
      );
    }
  }

  async getMenuItemWithCostAnalysis(
    restaurantId: string,
    id: string
  ): Promise<MenuItemResponseDto & { costAnalysis?: any }> {
    const menuItem = await this.findOne(restaurantId, id);

    // Find associated recipe
    const recipe = await this.recipeModel
      .findOne({ restaurantId, menuItemId: id, isActive: true })
      .lean();

    if (recipe) {
      return {
        ...menuItem,
        costAnalysis: {
          totalCost: recipe.costAnalysis.totalCost,
          foodCost: recipe.costAnalysis.totalIngredientCost,
          laborCost: recipe.costAnalysis.laborCost || 0,
          overheadCost: recipe.costAnalysis.overheadCost || 0,
          profitMargin: recipe.costAnalysis.profitMargin,
          profit: recipe.costAnalysis.profit,
          lastCalculated: recipe.costAnalysis.lastCalculated,
          hasRecipe: true,
        },
      };
    }

    return {
      ...menuItem,
      costAnalysis: {
        hasRecipe: false,
      },
    };
  }

  async getMenuProfitabilityAnalysis(restaurantId: string): Promise<{
    totalItems: number;
    itemsWithRecipes: number;
    averageProfitMargin: number;
    averageFoodCost: number;
    highMarginItems: Array<{
      id: string;
      name: string;
      profitMargin: number;
      profit: number;
    }>;
    lowMarginItems: Array<{
      id: string;
      name: string;
      profitMargin: number;
      totalCost: number;
    }>;
  }> {
    const [menuItems, recipes] = await Promise.all([
      this.menuItemModel.find({ restaurantId }).lean(),
      this.recipeModel.find({ restaurantId, isActive: true, menuItemId: { $ne: null } }).lean(),
    ]);

    const recipesMap = new Map(
      recipes.map(recipe => [recipe.menuItemId?.toString(), recipe])
    );

    const itemsWithRecipes = menuItems.filter(item =>
      recipesMap.has(item._id.toString())
    );

    if (itemsWithRecipes.length === 0) {
      return {
        totalItems: menuItems.length,
        itemsWithRecipes: 0,
        averageProfitMargin: 0,
        averageFoodCost: 0,
        highMarginItems: [],
        lowMarginItems: [],
      };
    }

    const itemsWithAnalysis = itemsWithRecipes.map(item => {
      const recipe = recipesMap.get(item._id.toString())!;
      return {
        id: item._id.toString(),
        name: item.name,
        profitMargin: recipe.costAnalysis.profitMargin || 0,
        profit: recipe.costAnalysis.profit || 0,
        totalCost: recipe.costAnalysis.totalCost,
      };
    }).filter(item => item.profitMargin !== undefined);

    const averageProfitMargin = itemsWithAnalysis.length > 0
      ? itemsWithAnalysis.reduce((sum, item) => sum + item.profitMargin, 0) / itemsWithAnalysis.length
      : 0;

    const averageFoodCost = itemsWithAnalysis.length > 0
      ? itemsWithAnalysis.reduce((sum, item) => sum + item.totalCost, 0) / itemsWithAnalysis.length
      : 0;

    const highMarginItems = itemsWithAnalysis
      .filter(item => item.profitMargin >= 30)
      .sort((a, b) => b.profitMargin - a.profitMargin)
      .slice(0, 5);

    const lowMarginItems = itemsWithAnalysis
      .filter(item => item.profitMargin < 20)
      .sort((a, b) => a.profitMargin - b.profitMargin)
      .slice(0, 5);

    return {
      totalItems: menuItems.length,
      itemsWithRecipes: itemsWithRecipes.length,
      averageProfitMargin,
      averageFoodCost,
      highMarginItems,
      lowMarginItems,
    };
  }

  private calculateDietaryInfo(ingredients: any[]): {
    isVegan: boolean;
    isVegetarian: boolean;
    isGlutenFree: boolean;
    isDairyFree: boolean;
    hasNuts: boolean;
    allergens: string[];
  } {
    if (!ingredients || ingredients.length === 0) {
      return {
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
        isDairyFree: false,
        hasNuts: false,
        allergens: [],
      };
    }

    let isVegan = true;
    let isVegetarian = true;
    let isGlutenFree = true;
    let isDairyFree = true;
    let hasNuts = false;
    const allergens = new Set<string>();

    for (const ingredient of ingredients) {
      if (!ingredient.isVegan) isVegan = false;
      if (!ingredient.isVegetarian) isVegetarian = false;
      if (!ingredient.isGlutenFree) isGlutenFree = false;
      if (!ingredient.isDairyFree) isDairyFree = false;

      if (ingredient.allergens) {
        ingredient.allergens.forEach((allergen: string) => {
          allergens.add(allergen.toLowerCase());
          if (allergen.toLowerCase().includes('nut')) hasNuts = true;
        });
      }
    }

    return {
      isVegan,
      isVegetarian,
      isGlutenFree,
      isDairyFree,
      hasNuts,
      allergens: Array.from(allergens),
    };
  }

  private toDto(doc: MenuItemDocument): MenuItemResponseDto {
    return {
      id: doc._id.toString(),
      restaurantId: doc.restaurantId.toString(),
      branchId: doc.branchId?.toString(),
      categoryId: doc.categoryId?.toString(),
      name: doc.name,
      description: doc.description,
      pricing: {
        amount: doc.pricing.amount,
        currency: doc.pricing.currency,
        isTaxInclusive: doc.pricing.isTaxInclusive,
      },
      tags: doc.tags,
      isAvailable: doc.isAvailable,
      displayOrder: doc.displayOrder,
      imageUrls: doc.imageUrls,

      // Enhanced POS Features
      nutritionalInfo: doc.nutritionalInfo,
      ingredients: doc.ingredients,
      applicableModifiers: doc.applicableModifiers?.map(id => id.toString()) || [],
      activePriceTagId: doc.activePriceTagId,

      // Dietary Information
      isVegan: doc.isVegan,
      isVegetarian: doc.isVegetarian,
      isGlutenFree: doc.isGlutenFree,
      isDairyFree: doc.isDairyFree,
      hasNuts: doc.hasNuts,
      allergens: doc.allergens,

      // Preparation Information
      prepTimeMinutes: doc.prepTimeMinutes,
      preparationDifficulty: doc.preparationDifficulty,
      kitchenStations: doc.kitchenStations,

      // GST fields
      foodCategory: doc.foodCategory,
      hsnCode: doc.hsnCode,
      gstRate: doc.gstRate,
      overrideGstRate: doc.overrideGstRate,
      exemptFromGst: doc.exemptFromGst,
      useStateVat: doc.useStateVat,
      categoryConfidence: doc.categoryConfidence,

      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private async getDefaultGstRateOrThrow(
    restaurantId: string
  ): Promise<{ gstRateId: string; gstRate: number }> {
    const defaultRate = await this.gstRateModel
      .findOne({ restaurantId, isDefault: true, isActive: true })
      .lean();

    if (!defaultRate) {
      throw new BadRequestException(
        'No default GST rate configured. Set a default rate in GST settings before enabling automatic GST.'
      );
    }

    return {
      gstRateId: defaultRate._id.toString(),
      gstRate: defaultRate.totalGstRate,
    };
  }

  private async resolveGstRate(
    restaurantId: string,
    gstRateId?: string
  ): Promise<{ gstRateId: string; gstRate: number } | null> {
    if (!gstRateId) {
      return null;
    }

    const rate = await this.gstRateModel
      .findOne({ _id: gstRateId, restaurantId, isActive: true })
      .lean();

    if (!rate) {
      throw new NotFoundException(
        `GST rate ${gstRateId} not found for restaurant ${restaurantId}`
      );
    }

    return {
      gstRateId: rate._id.toString(),
      gstRate: rate.totalGstRate,
    };
  }
}
