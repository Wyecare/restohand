import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Recipe, RecipeDocument } from './schemas/recipe.schema';
import { InventoryItem, InventoryItemDocument } from '../inventory/schemas/inventory-item.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';

export interface CreateRecipeDto {
  restaurantId: string;
  menuItemId?: string;
  name: string;
  description?: string;
  servings: number;
  ingredients: {
    inventoryItemId: string;
    quantity: number;
    unit: string;
    notes?: string;
  }[];
  instructions?: string[];
  preparationTime?: number;
  cookingTime?: number;
  difficulty?: string;
  dietaryTags?: string[];
  category?: string;
  notes?: string;
  laborCostPerServing?: number;
  overheadCostPerServing?: number;
}

export interface UpdateRecipeDto extends Partial<CreateRecipeDto> {
  isStandardized?: boolean;
}

export interface RecipeCostSummary {
  totalRecipes: number;
  averageFoodCost: number;
  averageProfitMargin: number;
  topProfitableRecipes: {
    recipeId: string;
    name: string;
    profitMargin: number;
    profit: number;
  }[];
  lowMarginRecipes: {
    recipeId: string;
    name: string;
    profitMargin: number;
    totalCost: number;
  }[];
}

@Injectable()
export class RecipesService {
  constructor(
    @InjectModel(Recipe.name) private recipeModel: Model<RecipeDocument>,
    @InjectModel(InventoryItem.name) private inventoryItemModel: Model<InventoryItemDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) {}

  async create(createRecipeDto: CreateRecipeDto): Promise<Recipe> {
    // Validate inventory items exist
    const inventoryItemIds = createRecipeDto.ingredients.map(ing => ing.inventoryItemId);
    const inventoryItems = await this.inventoryItemModel.find({
      _id: { $in: inventoryItemIds },
      restaurantId: createRecipeDto.restaurantId,
      isActive: true,
    });

    if (inventoryItems.length !== inventoryItemIds.length) {
      throw new BadRequestException('One or more inventory items not found or inactive');
    }

    // Validate menu item if provided
    if (createRecipeDto.menuItemId) {
      const menuItem = await this.menuItemModel.findOne({
        _id: createRecipeDto.menuItemId,
        restaurantId: createRecipeDto.restaurantId,
      });
      if (!menuItem) {
        throw new NotFoundException('Menu item not found');
      }
    }

    // Calculate costs for ingredients
    const enrichedIngredients = await this.calculateIngredientCosts(
      createRecipeDto.ingredients,
      inventoryItems
    );

    // Calculate total costs
    const costAnalysis = await this.calculateRecipeCosts(
      enrichedIngredients,
      createRecipeDto.servings,
      createRecipeDto.laborCostPerServing || 0,
      createRecipeDto.overheadCostPerServing || 0,
      createRecipeDto.menuItemId
    );

    const recipe = new this.recipeModel({
      ...createRecipeDto,
      ingredients: enrichedIngredients,
      costAnalysis,
      totalTime: (createRecipeDto.preparationTime || 0) + (createRecipeDto.cookingTime || 0),
    });

    const savedRecipe = await recipe.save();

    // Update inventory item usage tracking
    await this.updateInventoryItemUsage(createRecipeDto.restaurantId, inventoryItemIds, savedRecipe._id.toString());

    return savedRecipe;
  }

  async findAll(restaurantId: string, filters?: {
    category?: string;
    isStandardized?: boolean;
    hasMenuItem?: boolean;
    search?: string;
  }): Promise<Recipe[]> {
    const query: any = { restaurantId, isActive: true };

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.isStandardized !== undefined) {
      query.isStandardized = filters.isStandardized;
    }

    if (filters?.hasMenuItem !== undefined) {
      if (filters.hasMenuItem) {
        query.menuItemId = { $exists: true, $ne: null };
      } else {
        query.$or = [
          { menuItemId: { $exists: false } },
          { menuItemId: null }
        ];
      }
    }

    if (filters?.search) {
      query.$text = { $search: filters.search };
    }

    return this.recipeModel
      .find(query)
      .populate('menuItemId', 'name pricing')
      .populate('ingredients.inventoryItemId', 'name unit pricing.costPerUnit')
      .sort({ name: 1 })
      .exec();
  }

  async findOne(id: string, restaurantId: string): Promise<Recipe> {
    const recipe = await this.recipeModel
      .findOne({ _id: id, restaurantId })
      .populate('menuItemId', 'name pricing description')
      .populate('ingredients.inventoryItemId', 'name unit pricing.costPerUnit stockLevels.currentStock')
      .exec();

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    return recipe;
  }

  async update(id: string, restaurantId: string, updateRecipeDto: UpdateRecipeDto): Promise<Recipe> {
    const existingRecipe = await this.findOne(id, restaurantId);

    let enrichedIngredients = existingRecipe.ingredients;
    let costAnalysis = existingRecipe.costAnalysis;

    // If ingredients are being updated, recalculate costs
    if (updateRecipeDto.ingredients) {
      const inventoryItemIds = updateRecipeDto.ingredients.map(ing => ing.inventoryItemId);
      const inventoryItems = await this.inventoryItemModel.find({
        _id: { $in: inventoryItemIds },
        restaurantId,
        isActive: true,
      });

      if (inventoryItems.length !== inventoryItemIds.length) {
        throw new BadRequestException('One or more inventory items not found or inactive');
      }

      enrichedIngredients = await this.calculateIngredientCosts(
        updateRecipeDto.ingredients,
        inventoryItems
      );

      costAnalysis = await this.calculateRecipeCosts(
        enrichedIngredients,
        updateRecipeDto.servings || existingRecipe.servings,
        updateRecipeDto.laborCostPerServing || existingRecipe.costAnalysis.laborCost || 0,
        updateRecipeDto.overheadCostPerServing || existingRecipe.costAnalysis.overheadCost || 0,
        updateRecipeDto.menuItemId || existingRecipe.menuItemId
      );
    }

    const updatedRecipe = await this.recipeModel
      .findByIdAndUpdate(
        id,
        {
          ...updateRecipeDto,
          ingredients: enrichedIngredients,
          costAnalysis,
          totalTime: updateRecipeDto.preparationTime || updateRecipeDto.cookingTime
            ? (updateRecipeDto.preparationTime || 0) + (updateRecipeDto.cookingTime || 0)
            : undefined,
        },
        { new: true, runValidators: true }
      )
      .populate('menuItemId', 'name pricing')
      .populate('ingredients.inventoryItemId', 'name unit pricing.costPerUnit')
      .exec();

    if (!updatedRecipe) {
      throw new NotFoundException('Recipe not found');
    }

    return updatedRecipe;
  }

  async remove(id: string, restaurantId: string): Promise<void> {
    const recipe = await this.recipeModel.findOne({ _id: id, restaurantId });
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    await this.recipeModel.findByIdAndUpdate(id, { isActive: false });
  }

  async recalculateAllCosts(restaurantId: string): Promise<{ updated: number }> {
    const recipes = await this.recipeModel.find({ restaurantId, isActive: true });
    let updated = 0;

    for (const recipe of recipes) {
      try {
        const inventoryItemIds = recipe.ingredients.map(ing => ing.inventoryItemId.toString());
        const inventoryItems = await this.inventoryItemModel.find({
          _id: { $in: inventoryItemIds },
          restaurantId,
          isActive: true,
        });

        const enrichedIngredients = await this.calculateIngredientCosts(
          recipe.ingredients.map(ing => ({
            inventoryItemId: ing.inventoryItemId.toString(),
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
          })),
          inventoryItems
        );

        const costAnalysis = await this.calculateRecipeCosts(
          enrichedIngredients,
          recipe.servings,
          recipe.costAnalysis.laborCost || 0,
          recipe.costAnalysis.overheadCost || 0,
          recipe.menuItemId?.toString()
        );

        await this.recipeModel.findByIdAndUpdate(recipe._id, {
          ingredients: enrichedIngredients,
          costAnalysis,
        });

        updated++;
      } catch (error) {
        console.error(`Failed to update recipe ${recipe._id}:`, error);
      }
    }

    return { updated };
  }

  async getCostSummary(restaurantId: string): Promise<RecipeCostSummary> {
    const recipes = await this.recipeModel
      .find({ restaurantId, isActive: true })
      .populate('menuItemId', 'name pricing')
      .exec();

    if (recipes.length === 0) {
      return {
        totalRecipes: 0,
        averageFoodCost: 0,
        averageProfitMargin: 0,
        topProfitableRecipes: [],
        lowMarginRecipes: [],
      };
    }

    const totalFoodCost = recipes.reduce((sum, recipe) => sum + recipe.costAnalysis.totalCost, 0);
    const averageFoodCost = totalFoodCost / recipes.length;

    const recipesWithMargins = recipes
      .filter(recipe => recipe.costAnalysis.profitMargin !== undefined)
      .map(recipe => ({
        recipeId: recipe._id.toString(),
        name: recipe.name,
        profitMargin: recipe.costAnalysis.profitMargin!,
        profit: recipe.costAnalysis.profit || 0,
        totalCost: recipe.costAnalysis.totalCost,
      }));

    const averageProfitMargin = recipesWithMargins.length > 0
      ? recipesWithMargins.reduce((sum, recipe) => sum + recipe.profitMargin, 0) / recipesWithMargins.length
      : 0;

    const topProfitableRecipes = recipesWithMargins
      .sort((a, b) => b.profitMargin - a.profitMargin)
      .slice(0, 5);

    const lowMarginRecipes = recipesWithMargins
      .filter(recipe => recipe.profitMargin < 20) // Less than 20% margin
      .sort((a, b) => a.profitMargin - b.profitMargin)
      .slice(0, 5);

    return {
      totalRecipes: recipes.length,
      averageFoodCost,
      averageProfitMargin,
      topProfitableRecipes,
      lowMarginRecipes,
    };
  }

  private async calculateIngredientCosts(
    ingredients: { inventoryItemId: string; quantity: number; unit: string; notes?: string }[],
    inventoryItems: InventoryItemDocument[]
  ) {
    return ingredients.map(ingredient => {
      const inventoryItem = inventoryItems.find(
        item => item._id.toString() === ingredient.inventoryItemId
      );

      if (!inventoryItem) {
        throw new BadRequestException(`Inventory item ${ingredient.inventoryItemId} not found`);
      }

      const costPerUnit = inventoryItem.pricing.costPerUnit;
      const totalCost = ingredient.quantity * costPerUnit;

      return {
        inventoryItemId: ingredient.inventoryItemId,
        ingredientName: inventoryItem.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        costPerUnit,
        totalCost,
        notes: ingredient.notes,
      };
    });
  }

  private async calculateRecipeCosts(
    ingredients: any[],
    servings: number,
    laborCostPerServing: number,
    overheadCostPerServing: number,
    menuItemId?: string
  ) {
    const totalIngredientCost = ingredients.reduce(
      (sum, ingredient) => sum + (ingredient.totalCost || 0),
      0
    );

    const costPerServing = totalIngredientCost / servings;
    const laborCost = laborCostPerServing;
    const overheadCost = overheadCostPerServing;
    const totalCost = costPerServing + laborCost + overheadCost;

    let sellingPrice: number | undefined;
    let profitMargin: number | undefined;
    let profit: number | undefined;

    if (menuItemId) {
      const menuItem = await this.menuItemModel.findById(menuItemId);
      if (menuItem) {
        sellingPrice = menuItem.pricing.amount;
        profit = sellingPrice - totalCost;
        profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
      }
    }

    return {
      totalIngredientCost: costPerServing,
      laborCost,
      overheadCost,
      totalCost,
      sellingPrice,
      profitMargin,
      profit,
      lastCalculated: new Date(),
    };
  }

  private async updateInventoryItemUsage(
    restaurantId: string,
    inventoryItemIds: string[],
    recipeId: string
  ): Promise<void> {
    await this.inventoryItemModel.updateMany(
      {
        _id: { $in: inventoryItemIds },
        restaurantId,
      },
      {
        $addToSet: { usedInMenuItems: recipeId }
      }
    );
  }
}