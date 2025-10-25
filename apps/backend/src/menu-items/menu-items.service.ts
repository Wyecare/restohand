import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItemDocument>,
    @InjectModel(GstRate.name)
    private readonly gstRateModel: Model<GstRateDocument>
  ) {}

  async create(
    restaurantId: string,
    dto: CreateMenuItemDto
  ): Promise<MenuItemResponseDto> {
    const gstMetadata = await this.resolveGstRate(restaurantId, dto.gstRateId);

    const created = await this.menuItemModel.create({
      ...dto,
      hsnCode: dto.hsnCode?.trim(),
      gstRateId: gstMetadata?.gstRateId ?? dto.gstRateId,
      gstRate: dto.gstRate ?? gstMetadata?.gstRate,
      restaurantId,
    });
    return this.toDto(created);
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

    if (dto.hsnCode !== undefined) {
      updateData.hsnCode = dto.hsnCode?.trim();
    }

    if (dto.gstRateId !== undefined) {
      const gstMetadata = await this.resolveGstRate(restaurantId, dto.gstRateId);
      updateData.gstRateId = gstMetadata?.gstRateId ?? dto.gstRateId;
      if (dto.gstRate === undefined && gstMetadata?.gstRate !== undefined) {
        updateData.gstRate = gstMetadata.gstRate;
      }
    }

    if (dto.gstRate !== undefined) {
      updateData.gstRate = dto.gstRate;
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

  private toDto(doc: MenuItemDocument): MenuItemResponseDto {
    return {
      id: doc._id.toString(),
      restaurantId: doc.restaurantId.toString(),
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
      hsnCode: doc.hsnCode,
      gstRateId: doc.gstRateId,
      gstRate: doc.gstRate,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
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
