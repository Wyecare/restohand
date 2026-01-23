import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { MenuCategoryResponseDto } from './dtos/menu-category-response.dto';
import { MenuCategoryListResponseDto } from './dtos/menu-category-list-response.dto';
import { CreateMenuCategoryDto } from './dtos/create-menu-category.dto';
import { QueryMenuCategoriesDto } from './dtos/query-menu-categories.dto';
import { UpdateMenuCategoryDto } from './dtos/update-menu-category.dto';
import {
  MenuCategory,
  MenuCategoryDocument,
} from './schemas/menu-category.schema';
import { PaginationUtil } from '../common/utils/pagination.util';

@Injectable()
export class MenuCategoriesService {
  constructor(
    @InjectModel(MenuCategory.name)
    private readonly menuCategoryModel: Model<MenuCategoryDocument>
  ) {}

  async create(
    restaurantId: string,
    dto: CreateMenuCategoryDto
  ): Promise<MenuCategoryResponseDto> {
    const created = await this.menuCategoryModel.create({
      ...dto,
      restaurantId,
    });
    return this.toDto(created);
  }

  async findByBranch(
    restaurantId: string,
    branchId: string,
    query: QueryMenuCategoriesDto = {},
  ): Promise<MenuCategoryListResponseDto> {
    const { skip, limit, page } = PaginationUtil.parsePaginationOptions(query);

    // Build filter
    const filter: any = { restaurantId, branchId };

    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    // Execute queries in parallel
    const [total, items] = await Promise.all([
      this.menuCategoryModel.countDocuments(filter),
      this.menuCategoryModel
        .find(filter)
        .sort({ displayOrder: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    const data = items.map((item) => this.toDto(item));

    return PaginationUtil.createPaginatedResponse(data, total, page, limit);
  }

  async createForBranch(
    restaurantId: string,
    branchId: string,
    dto: CreateMenuCategoryDto
  ): Promise<MenuCategoryResponseDto> {
    const created = await this.menuCategoryModel.create({
      ...dto,
      restaurantId,
      branchId,
    });
    return this.toDto(created);
  }

  async findAllByBranches(
    restaurantId: string,
    branchIds: string[],
    query: QueryMenuCategoriesDto = {}
  ): Promise<MenuCategoryListResponseDto> {
    const { skip, limit, page } = PaginationUtil.parsePaginationOptions(query);

    const filter: FilterQuery<MenuCategoryDocument> = {
      restaurantId,
      branchId: { $in: branchIds }
    };

    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    // Execute queries in parallel
    const [total, items] = await Promise.all([
      this.menuCategoryModel.countDocuments(filter),
      this.menuCategoryModel
        .find(filter)
        .sort({ displayOrder: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    const data = items.map((item) => this.toDto(item));

    return PaginationUtil.createPaginatedResponse(data, total, page, limit);
  }

  async findAll(
    restaurantId: string,
    query: QueryMenuCategoriesDto = {},
  ): Promise<MenuCategoryListResponseDto> {
    const { skip, limit, page } = PaginationUtil.parsePaginationOptions(query);

    // Build filter
    const filter: any = { restaurantId };

    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    // Execute queries in parallel
    const [total, items] = await Promise.all([
      this.menuCategoryModel.countDocuments(filter),
      this.menuCategoryModel
        .find(filter)
        .sort({ displayOrder: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    const data = items.map((item) => this.toDto(item));

    return PaginationUtil.createPaginatedResponse(data, total, page, limit);
  }

  async update(
    restaurantId: string,
    id: string,
    dto: UpdateMenuCategoryDto
  ): Promise<MenuCategoryResponseDto> {
    const updated = await this.menuCategoryModel.findOneAndUpdate(
      { _id: id, restaurantId },
      { $set: dto },
      { new: true }
    );
    if (!updated) {
      throw new NotFoundException(
        `Menu category ${id} not found for restaurant ${restaurantId}`
      );
    }
    return this.toDto(updated);
  }

  async remove(restaurantId: string, id: string): Promise<void> {
    const res = await this.menuCategoryModel.findOneAndDelete({
      _id: id,
      restaurantId,
    });
    if (!res) {
      throw new NotFoundException(
        `Menu category ${id} not found for restaurant ${restaurantId}`
      );
    }
  }

  private toDto(doc: MenuCategoryDocument): MenuCategoryResponseDto {
    return {
      id: doc._id.toString(),
      restaurantId: doc.restaurantId.toString(),
      branchId: doc.branchId?.toString(),
      name: doc.name,
      description: doc.description,
      displayOrder: doc.displayOrder,
      isActive: doc.isActive,
      defaultGstRateId: doc.defaultGstRateId,
      defaultGstRate: doc.defaultGstRate,
      gstCategoryType: doc.gstCategoryType,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
