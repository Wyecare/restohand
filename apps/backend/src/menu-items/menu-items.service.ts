import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CreateMenuItemDto } from './dtos/create-menu-item.dto';
import { MenuItemListResponseDto } from './dtos/menu-item-list-response.dto';
import { MenuItemResponseDto } from './dtos/menu-item-response.dto';
import { QueryMenuItemsDto } from './dtos/query-menu-items.dto';
import { UpdateMenuItemDto } from './dtos/update-menu-item.dto';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItemDocument>
  ) {}

  async create(
    restaurantId: string,
    dto: CreateMenuItemDto
  ): Promise<MenuItemResponseDto> {
    const created = await this.menuItemModel.create({
      ...dto,
      restaurantId,
    });
    return this.toDto(created);
  }

  async findAll(
    restaurantId: string,
    query: QueryMenuItemsDto
  ): Promise<MenuItemListResponseDto> {
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

    const items = await this.menuItemModel
      .find(filter)
      .sort({ displayOrder: 1, name: 1 });

    return {
      data: items.map((item) => this.toDto(item)),
    };
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
    const updated = await this.menuItemModel.findOneAndUpdate(
      { _id: id, restaurantId },
      { $set: dto },
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
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
