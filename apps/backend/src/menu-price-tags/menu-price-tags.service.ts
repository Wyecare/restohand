import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MenuPriceTag, MenuPriceTagDocument } from './schemas/menu-price-tag.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { CreateMenuPriceTagDto } from './dtos/create-menu-price-tag.dto';
import { UpdateMenuPriceTagDto } from './dtos/update-menu-price-tag.dto';
import { QueryMenuPriceTagsDto } from './dtos/query-menu-price-tags.dto';
import { ActivatePriceTagDto } from './dtos/activate-price-tag.dto';
import { MenuPriceTagResponseDto } from './dtos/menu-price-tag-response.dto';
import { MenuPriceTagListResponseDto } from './dtos/menu-price-tag-list-response.dto';
import { PaginationUtil } from '../common/utils/pagination.util';

@Injectable()
export class MenuPriceTagsService {
  constructor(
    @InjectModel(MenuPriceTag.name)
    private readonly menuPriceTagModel: Model<MenuPriceTagDocument>,
    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItemDocument>,
  ) {}

  async createForBranch(
    restaurantId: string,
    branchId: string,
    dto: CreateMenuPriceTagDto
  ): Promise<MenuPriceTagResponseDto> {
    // Validate menu items exist
    if (dto.itemPrices && dto.itemPrices.length > 0) {
      const menuItemIds = dto.itemPrices.map(item => item.menuItemId);
      const existingItems = await this.menuItemModel
        .find({
          _id: { $in: menuItemIds },
          restaurantId,
          branchId,
        })
        .select('_id');

      const existingItemIds = existingItems.map(item => item._id.toString());
      const nonExistentItems = menuItemIds.filter(
        itemId => !existingItemIds.includes(itemId)
      );

      if (nonExistentItems.length > 0) {
        throw new BadRequestException(
          `Menu items not found: ${nonExistentItems.join(', ')}`
        );
      }
    }

    // Check if trying to create multiple default tags
    if (dto.isDefault) {
      const existingDefault = await this.menuPriceTagModel.findOne({
        restaurantId,
        branchId,
        isDefault: true,
      });

      if (existingDefault) {
        throw new ConflictException('A default price tag already exists for this branch');
      }
    }

    // Allow multiple active price tags per branch
    // Users can now have multiple price tags active simultaneously

    const created = await this.menuPriceTagModel.create({
      ...dto,
      restaurantId,
      branchId,
      activatedAt: dto.isActive ? new Date() : undefined,
    });

    // Note: Menu items will choose which price tag to use
    // No automatic price updates needed since we support multiple active tags

    return this.toDto(created);
  }

  async findByBranch(
    restaurantId: string,
    branchId: string,
    query: QueryMenuPriceTagsDto = {},
  ): Promise<MenuPriceTagListResponseDto> {
    const { skip, limit, page } = PaginationUtil.parsePaginationOptions(query);

    const filter: FilterQuery<MenuPriceTagDocument> = { restaurantId, branchId };

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.isDefault !== undefined) {
      filter.isDefault = query.isDefault;
    }

    if (query.menuItemId) {
      filter['itemPrices.menuItemId'] = query.menuItemId;
    }

    const [total, items] = await Promise.all([
      this.menuPriceTagModel.countDocuments(filter),
      this.menuPriceTagModel
        .find(filter)
        .sort({ priority: -1, displayOrder: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    const data = items.map((item) => this.toDto(item));

    return PaginationUtil.createPaginatedResponse(data, total, page, limit);
  }

  async findOne(
    restaurantId: string,
    priceTagId: string
  ): Promise<MenuPriceTagResponseDto> {
    const priceTag = await this.menuPriceTagModel.findOne({
      _id: priceTagId,
      restaurantId,
    });

    if (!priceTag) {
      throw new NotFoundException(
        `Menu price tag ${priceTagId} not found for restaurant ${restaurantId}`
      );
    }

    return this.toDto(priceTag);
  }

  async update(
    restaurantId: string,
    priceTagId: string,
    dto: UpdateMenuPriceTagDto
  ): Promise<MenuPriceTagResponseDto> {
    const existingTag = await this.menuPriceTagModel.findOne({
      _id: priceTagId,
      restaurantId,
    });

    if (!existingTag) {
      throw new NotFoundException(
        `Menu price tag ${priceTagId} not found for restaurant ${restaurantId}`
      );
    }

    // Validate menu items if provided
    if (dto.itemPrices && dto.itemPrices.length > 0) {
      const menuItemIds = dto.itemPrices.map(item => item.menuItemId);
      const existingItems = await this.menuItemModel
        .find({
          _id: { $in: menuItemIds },
          restaurantId,
          branchId: existingTag.branchId,
        })
        .select('_id');

      const existingItemIds = existingItems.map(item => item._id.toString());
      const nonExistentItems = menuItemIds.filter(
        itemId => !existingItemIds.includes(itemId)
      );

      if (nonExistentItems.length > 0) {
        throw new BadRequestException(
          `Menu items not found: ${nonExistentItems.join(', ')}`
        );
      }
    }

    // Check default tag constraints
    if (dto.isDefault && !existingTag.isDefault) {
      const existingDefault = await this.menuPriceTagModel.findOne({
        restaurantId,
        branchId: existingTag.branchId,
        isDefault: true,
        _id: { $ne: priceTagId },
      });

      if (existingDefault) {
        throw new ConflictException('A default price tag already exists for this branch');
      }
    }

    const updated = await this.menuPriceTagModel.findOneAndUpdate(
      { _id: priceTagId, restaurantId },
      { $set: dto },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException(
        `Menu price tag ${priceTagId} not found for restaurant ${restaurantId}`
      );
    }

    return this.toDto(updated);
  }

  async remove(restaurantId: string, priceTagId: string): Promise<void> {
    const priceTag = await this.menuPriceTagModel.findOne({
      _id: priceTagId,
      restaurantId,
    });

    if (!priceTag) {
      throw new NotFoundException(
        `Menu price tag ${priceTagId} not found for restaurant ${restaurantId}`
      );
    }

    if (priceTag.isDefault) {
      throw new BadRequestException('Cannot delete the default price tag');
    }

    if (priceTag.isActive) {
      // Deactivate first and revert to default pricing
      await this.deactivatePriceTag(priceTagId, restaurantId);
    }

    await this.menuPriceTagModel.findByIdAndDelete(priceTagId);
  }

  async activatePriceTag(
    restaurantId: string,
    branchId: string,
    priceTagId: string,
    dto: ActivatePriceTagDto,
    activatedBy?: string
  ): Promise<MenuPriceTagResponseDto> {
    const priceTag = await this.menuPriceTagModel.findOne({
      _id: priceTagId,
      restaurantId,
      branchId,
    });

    if (!priceTag) {
      throw new NotFoundException(`Price tag ${priceTagId} not found`);
    }

    if (dto.isActive) {
      // Allow multiple active price tags - no conflict checking needed
      // Activate this price tag without deactivating others
      const updated = await this.menuPriceTagModel.findByIdAndUpdate(
        priceTagId,
        {
          $set: {
            isActive: true,
            activatedAt: new Date(),
            activatedBy: activatedBy,
            deactivatedAt: undefined,
          },
        },
        { new: true }
      );

      // Note: Menu items will choose which price tag to use
      // No automatic price updates needed since we support multiple active tags

      return this.toDto(updated!);
    } else {
      // Deactivate price tag
      return this.deactivatePriceTag(priceTagId, restaurantId);
    }
  }

  async deactivatePriceTag(priceTagId: string, restaurantId: string): Promise<MenuPriceTagResponseDto> {
    const updated = await this.menuPriceTagModel.findOneAndUpdate(
      { _id: priceTagId, restaurantId },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException(`Price tag ${priceTagId} not found`);
    }

    // Note: Menu items control their own price tag selection
    // No automatic price reversion needed since we support multiple active tags

    return this.toDto(updated);
  }

  async getActivePriceTag(restaurantId: string, branchId: string): Promise<MenuPriceTagResponseDto | null> {
    const activeTag = await this.menuPriceTagModel.findOne({
      restaurantId,
      branchId,
      isActive: true,
    });

    return activeTag ? this.toDto(activeTag) : null;
  }

  async getItemPrice(menuItemId: string, priceTagId?: string): Promise<{
    originalPrice: number;
    currentPrice: number;
    discountAmount?: number;
    priceTag?: MenuPriceTagResponseDto;
  }> {
    const menuItem = await this.menuItemModel.findById(menuItemId);
    if (!menuItem) {
      throw new NotFoundException(`Menu item ${menuItemId} not found`);
    }

    const originalPrice = menuItem.pricing.amount;
    let currentPrice = originalPrice;
    let discountAmount: number | undefined;
    let priceTag: MenuPriceTagResponseDto | undefined;

    // Use provided price tag or find active one
    let activePriceTag: MenuPriceTagDocument | null = null;

    if (priceTagId) {
      activePriceTag = await this.menuPriceTagModel.findById(priceTagId);
    } else {
      activePriceTag = await this.menuPriceTagModel.findOne({
        restaurantId: menuItem.restaurantId,
        branchId: menuItem.branchId,
        isActive: true,
      });
    }

    if (activePriceTag) {
      const itemPrice = activePriceTag.itemPrices.find(
        item => item.menuItemId.toString() === menuItemId
      );

      if (itemPrice && itemPrice.isActive) {
        priceTag = this.toDto(activePriceTag);

        if (itemPrice.discountType === 'fixed') {
          currentPrice = itemPrice.price;
          discountAmount = originalPrice - currentPrice;
        } else if (itemPrice.discountType === 'percentage_off') {
          discountAmount = (originalPrice * (itemPrice.discountValue || 0)) / 100;
          currentPrice = originalPrice - discountAmount;
        } else if (itemPrice.discountType === 'amount_off') {
          discountAmount = itemPrice.discountValue || 0;
          currentPrice = Math.max(0, originalPrice - discountAmount);
        }
      }
    }

    return {
      originalPrice,
      currentPrice,
      discountAmount,
      priceTag,
    };
  }

  // Cron job to auto-activate/deactivate price tags based on rules
  @Cron(CronExpression.EVERY_MINUTE)
  async processAutoActivation() {
    const now = new Date();

    // Find tags that should be auto-activated
    const tagsToActivate = await this.menuPriceTagModel.find({
      autoActivate: true,
      isActive: false,
      'applicabilityRule.type': { $in: ['date_range', 'day_of_week', 'time_range'] },
    });

    for (const tag of tagsToActivate) {
      if (await this.shouldTagBeActive(tag, now)) {
        try {
          await this.activatePriceTag(
            tag.restaurantId,
            tag.branchId,
            tag._id.toString(),
            { isActive: true, force: true },
            'auto-activation'
          );
        } catch (error) {
          console.error(`Failed to auto-activate price tag ${tag._id}:`, error);
        }
      }
    }

    // Find active tags that should be deactivated
    const activeTags = await this.menuPriceTagModel.find({
      isActive: true,
      'applicabilityRule.type': { $in: ['date_range', 'day_of_week', 'time_range'] },
    });

    for (const tag of activeTags) {
      if (!(await this.shouldTagBeActive(tag, now))) {
        try {
          await this.deactivatePriceTag(tag._id.toString(), tag.restaurantId);
        } catch (error) {
          console.error(`Failed to auto-deactivate price tag ${tag._id}:`, error);
        }
      }
    }
  }

  private async shouldTagBeActive(tag: MenuPriceTagDocument, now: Date): Promise<boolean> {
    if (!tag.applicabilityRule) return false;

    const rule = tag.applicabilityRule;

    switch (rule.type) {
      case 'always':
        return true;

      case 'date_range':
        if (!rule.startDate || !rule.endDate) return false;
        return now >= rule.startDate && now <= rule.endDate;

      case 'day_of_week':
        if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) return false;
        return rule.daysOfWeek.includes(now.getDay());

      case 'time_range':
        if (!rule.startTime || !rule.endTime) return false;
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        return currentTime >= rule.startTime && currentTime <= rule.endTime;

      default:
        return false;
    }
  }

  private async updateMenuItemPrices(priceTag: MenuPriceTagDocument): Promise<void> {
    const menuItemIds = priceTag.itemPrices
      .filter(item => item.isActive)
      .map(item => item.menuItemId);

    await this.menuItemModel.updateMany(
      {
        _id: { $in: menuItemIds },
        restaurantId: priceTag.restaurantId,
        branchId: priceTag.branchId,
      },
      {
        $set: { activePriceTagId: priceTag._id.toString() },
      }
    );
  }

  private toDto(doc: MenuPriceTagDocument): MenuPriceTagResponseDto {
    return {
      id: doc._id.toString(),
      restaurantId: doc.restaurantId.toString(),
      branchId: doc.branchId.toString(),
      name: doc.name,
      description: doc.description,
      color: doc.color,
      isActive: doc.isActive,
      isDefault: doc.isDefault,
      priority: doc.priority,
      applicabilityRule: doc.applicabilityRule ? {
        type: doc.applicabilityRule.type,
        startDate: doc.applicabilityRule.startDate?.toISOString(),
        endDate: doc.applicabilityRule.endDate?.toISOString(),
        daysOfWeek: doc.applicabilityRule.daysOfWeek,
        startTime: doc.applicabilityRule.startTime,
        endTime: doc.applicabilityRule.endTime,
      } : undefined,
      itemPrices: doc.itemPrices.map(item => ({
        menuItemId: item.menuItemId.toString(),
        price: item.price,
        currency: item.currency,
        discountType: item.discountType,
        discountValue: item.discountValue,
        isActive: item.isActive,
      })),
      autoActivate: doc.autoActivate,
      activatedAt: doc.activatedAt?.toISOString(),
      deactivatedAt: doc.deactivatedAt?.toISOString(),
      activatedBy: doc.activatedBy,
      displayOrder: doc.displayOrder,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}