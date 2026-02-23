import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { MenuModifier, MenuModifierDocument } from './schemas/menu-modifier.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { CreateMenuModifierDto } from './dtos/create-menu-modifier.dto';
import { UpdateMenuModifierDto } from './dtos/update-menu-modifier.dto';
import { QueryMenuModifiersDto } from './dtos/query-menu-modifiers.dto';
import { MenuModifierResponseDto } from './dtos/menu-modifier-response.dto';
import { MenuModifierListResponseDto } from './dtos/menu-modifier-list-response.dto';
import { PaginationUtil } from '../common/utils/pagination.util';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MenuModifiersService {
  constructor(
    @InjectModel(MenuModifier.name)
    private readonly menuModifierModel: Model<MenuModifierDocument>,
    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItemDocument>,
  ) {}

  async createForBranch(
    restaurantId: string,
    branchId: string,
    dto: CreateMenuModifierDto
  ): Promise<MenuModifierResponseDto> {
    // Validate min/max selections
    if (dto.minSelections > dto.maxSelections) {
      throw new BadRequestException('minSelections cannot be greater than maxSelections');
    }

    if (dto.selectionType === 'single' && dto.maxSelections > 1) {
      throw new BadRequestException('Single selection type cannot have maxSelections > 1');
    }

    // Generate unique IDs for options
    const optionsWithIds = dto.options.map(option => ({
      ...option,
      id: uuidv4(),
    }));

    // Validate applicable menu items exist
    if (dto.applicableMenuItems && dto.applicableMenuItems.length > 0) {
      const existingItems = await this.menuItemModel
        .find({
          _id: { $in: dto.applicableMenuItems },
          restaurantId,
          branchId,
        })
        .select('_id');

      const existingItemIds = existingItems.map(item => item._id.toString());
      const nonExistentItems = dto.applicableMenuItems.filter(
        itemId => !existingItemIds.includes(itemId)
      );

      if (nonExistentItems.length > 0) {
        throw new BadRequestException(
          `Menu items not found: ${nonExistentItems.join(', ')}`
        );
      }
    }

    const created = await this.menuModifierModel.create({
      ...dto,
      options: optionsWithIds,
      restaurantId,
      branchId,
    });

    return this.toDto(created);
  }

  async findByBranch(
    restaurantId: string,
    branchId: string,
    query: QueryMenuModifiersDto = {},
  ): Promise<MenuModifierListResponseDto> {
    const { skip, limit, page } = PaginationUtil.parsePaginationOptions(query);

    const filter: FilterQuery<MenuModifierDocument> = { restaurantId, branchId };

    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.menuItemId) {
      filter.applicableMenuItems = { $in: [query.menuItemId] };
    }

    if (query.categoryName) {
      filter.applicableCategories = { $in: [query.categoryName] };
    }

    const [total, items] = await Promise.all([
      this.menuModifierModel.countDocuments(filter),
      this.menuModifierModel
        .find(filter)
        .sort({ displayOrder: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    const data = items.map((item) => this.toDto(item));

    return PaginationUtil.createPaginatedResponse(data, total, page, limit);
  }

  async findOne(
    restaurantId: string,
    modifierId: string
  ): Promise<MenuModifierResponseDto> {
    const modifier = await this.menuModifierModel.findOne({
      _id: modifierId,
      restaurantId,
    });

    if (!modifier) {
      throw new NotFoundException(
        `Menu modifier ${modifierId} not found for restaurant ${restaurantId}`
      );
    }

    return this.toDto(modifier);
  }

  async update(
    restaurantId: string,
    modifierId: string,
    dto: UpdateMenuModifierDto
  ): Promise<MenuModifierResponseDto> {
    // Validate constraints if provided
    if (dto.minSelections !== undefined && dto.maxSelections !== undefined) {
      if (dto.minSelections > dto.maxSelections) {
        throw new BadRequestException('minSelections cannot be greater than maxSelections');
      }
    }

    if (dto.selectionType === 'single' && dto.maxSelections && dto.maxSelections > 1) {
      throw new BadRequestException('Single selection type cannot have maxSelections > 1');
    }

    // Generate IDs for new options
    if (dto.options) {
      dto.options = dto.options.map(option => ({
        ...option,
        id: option.id || uuidv4(),
      }));
    }

    // Validate applicable menu items if provided
    if (dto.applicableMenuItems && dto.applicableMenuItems.length > 0) {
      const existingItems = await this.menuItemModel
        .find({
          _id: { $in: dto.applicableMenuItems },
          restaurantId,
        })
        .select('_id');

      const existingItemIds = existingItems.map(item => item._id.toString());
      const nonExistentItems = dto.applicableMenuItems.filter(
        itemId => !existingItemIds.includes(itemId)
      );

      if (nonExistentItems.length > 0) {
        throw new BadRequestException(
          `Menu items not found: ${nonExistentItems.join(', ')}`
        );
      }
    }

    const updated = await this.menuModifierModel.findOneAndUpdate(
      { _id: modifierId, restaurantId },
      { $set: dto },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException(
        `Menu modifier ${modifierId} not found for restaurant ${restaurantId}`
      );
    }

    return this.toDto(updated);
  }

  async remove(restaurantId: string, modifierId: string): Promise<void> {
    const result = await this.menuModifierModel.findOneAndDelete({
      _id: modifierId,
      restaurantId,
    });

    if (!result) {
      throw new NotFoundException(
        `Menu modifier ${modifierId} not found for restaurant ${restaurantId}`
      );
    }

    // Remove modifier references from menu items
    await this.menuItemModel.updateMany(
      {
        restaurantId,
        applicableModifiers: { $in: [modifierId] }
      },
      {
        $pull: { applicableModifiers: modifierId }
      }
    );
  }

  async getModifiersForMenuItem(
    restaurantId: string,
    menuItemId: string
  ): Promise<MenuModifierResponseDto[]> {
    const menuItem = await this.menuItemModel.findOne({
      _id: menuItemId,
      restaurantId,
    });

    if (!menuItem) {
      throw new NotFoundException(`Menu item ${menuItemId} not found`);
    }

    const modifiers = await this.menuModifierModel
      .find({
        restaurantId,
        branchId: menuItem.branchId,
        isActive: true,
        $or: [
          { applicableMenuItems: { $in: [menuItemId] } },
          { applicableCategories: { $in: [menuItem.categoryId] } },
        ],
      })
      .sort({ displayOrder: 1 });

    // Apply excluded options per menu item
    const modifiersWithFiltering = modifiers.map(modifier => {
      const excludedOptions = menuItem.excludedModifierOptions?.[modifier._id.toString()] || [];

      if (excludedOptions.length > 0) {
        // Filter out excluded options
        const filteredOptions = modifier.options.filter(
          option => !excludedOptions.includes(option.id)
        );

        return {
          ...modifier.toObject(),
          options: filteredOptions
        };
      }

      return modifier;
    });

    return modifiersWithFiltering.map(modifier => this.toDto(modifier));
  }

  async validateModifierSelections(
    modifierId: string,
    selectedOptions: { optionId: string; quantity?: number }[] | string[]
  ): Promise<{ isValid: boolean; error?: string; totalPriceAdjustment: number }> {
    // Handle legacy string array format
    const normalizedSelections = Array.isArray(selectedOptions) && typeof selectedOptions[0] === 'string'
      ? (selectedOptions as string[]).map(optionId => ({ optionId, quantity: 1 }))
      : selectedOptions as { optionId: string; quantity?: number }[];
    const modifier = await this.menuModifierModel.findById(modifierId);

    if (!modifier) {
      return { isValid: false, error: 'Modifier not found', totalPriceAdjustment: 0 };
    }

    if (!modifier.isActive) {
      return { isValid: false, error: 'Modifier is not active', totalPriceAdjustment: 0 };
    }

    // Validate quantities for unique/non-unique options
    for (const selection of normalizedSelections) {
      const quantity = selection.quantity || 1;

      if (modifier.unique && quantity > 1) {
        return {
          isValid: false,
          error: 'Cannot select same option multiple times for unique modifier',
          totalPriceAdjustment: 0,
        };
      }

      if (quantity < 1) {
        return {
          isValid: false,
          error: 'Quantity must be at least 1',
          totalPriceAdjustment: 0,
        };
      }
    }

    // Calculate total selection count (sum of quantities)
    const totalSelectionCount = normalizedSelections.reduce(
      (sum, selection) => sum + (selection.quantity || 1),
      0
    );

    // Check selection count constraints
    if (totalSelectionCount < modifier.minSelections) {
      return {
        isValid: false,
        error: `At least ${modifier.minSelections} options must be selected`,
        totalPriceAdjustment: 0,
      };
    }

    if (totalSelectionCount > modifier.maxSelections) {
      return {
        isValid: false,
        error: `At most ${modifier.maxSelections} options can be selected`,
        totalPriceAdjustment: 0,
      };
    }

    // Check if all selected options exist and are available
    const validOptions = modifier.options.filter(option => option.isAvailable && option.inStock);
    const validOptionIds = validOptions.map(option => option.id);

    const invalidSelections = normalizedSelections.filter(
      selection => !validOptionIds.includes(selection.optionId)
    );

    if (invalidSelections.length > 0) {
      const invalidIds = invalidSelections.map(s => s.optionId);
      return {
        isValid: false,
        error: `Invalid, unavailable, or out of stock options: ${invalidIds.join(', ')}`,
        totalPriceAdjustment: 0,
      };
    }

    // Calculate total price adjustment with free options logic
    let totalPriceAdjustment = 0;
    let selectionsSoFar = 0;

    // Sort selections by price (cheapest first) to maximize free options benefit
    const sortedSelections = normalizedSelections
      .map(selection => {
        const option = modifier.options.find(opt => opt.id === selection.optionId)!;
        return { ...selection, option };
      })
      .sort((a, b) => a.option.priceAdjustment - b.option.priceAdjustment);

    for (const selection of sortedSelections) {
      const quantity = selection.quantity || 1;

      for (let i = 0; i < quantity; i++) {
        selectionsSoFar++;

        // Apply free options logic - first N selections are free
        if (selectionsSoFar > modifier.freeOptions) {
          totalPriceAdjustment += selection.option.priceAdjustment;
        }
      }
    }

    return {
      isValid: true,
      totalPriceAdjustment,
    };
  }

  private toDto(doc: MenuModifierDocument): MenuModifierResponseDto {
    return {
      id: doc._id.toString(),
      restaurantId: doc.restaurantId.toString(),
      branchId: doc.branchId.toString(),
      name: doc.name,
      description: doc.description,
      selectionType: doc.selectionType,
      minSelections: doc.minSelections,
      maxSelections: doc.maxSelections,
      freeOptions: doc.freeOptions,
      unique: doc.unique,
      isRequired: doc.isRequired,
      options: doc.options.map(option => ({
        id: option.id,
        name: option.name,
        description: option.description,
        priceAdjustment: option.priceAdjustment,
        currency: option.currency,
        isAvailable: option.isAvailable,
        inStock: option.inStock,
        displayOrder: option.displayOrder,
        imageUrl: option.imageUrl,
        calories: option.calories,
        allergens: option.allergens,
      })),
      isActive: doc.isActive,
      displayOrder: doc.displayOrder,
      applicableMenuItems: doc.applicableMenuItems.map(id => id.toString()),
      applicableCategories: doc.applicableCategories,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}