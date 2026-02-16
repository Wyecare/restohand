import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { MenuCategoryResponseDto } from './dtos/menu-category-response.dto';
import { MenuCategoryListResponseDto } from './dtos/menu-category-list-response.dto';
import { CreateMenuCategoryDto } from './dtos/create-menu-category.dto';
import { QueryMenuCategoriesDto } from './dtos/query-menu-categories.dto';
import { UpdateMenuCategoryDto } from './dtos/update-menu-category.dto';
import { MenuSearchQueryDto, MenuSearchResponseDto, MenuSearchResultItem } from './dtos/menu-search.dto';
import {
  MenuCategory,
  MenuCategoryDocument,
} from './schemas/menu-category.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { PaginationUtil } from '../common/utils/pagination.util';

@Injectable()
export class MenuCategoriesService {
  constructor(
    @InjectModel(MenuCategory.name)
    private readonly menuCategoryModel: Model<MenuCategoryDocument>,
    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItemDocument>
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
    query: QueryMenuCategoriesDto = {}
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

    console.log(
      'Filter for findByBranch:',
      filter,
      'Skip:',
      skip,
      'Limit:',
      limit
    );

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
      branchId: { $in: branchIds },
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
    query: QueryMenuCategoriesDto = {}
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

  async findOne(
    restaurantId: string,
    id: string
  ): Promise<MenuCategoryResponseDto> {
    const category = await this.menuCategoryModel.findOne({
      _id: id,
      restaurantId,
    });

    if (!category) {
      throw new NotFoundException(
        `Menu category ${id} not found for restaurant ${restaurantId}`
      );
    }

    return this.toDto(category);
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

  async searchMenuByBranch(
    restaurantId: string,
    branchId: string,
    query: MenuSearchQueryDto
  ): Promise<MenuSearchResponseDto> {
    const startTime = Date.now();
    const { skip, limit, page } = PaginationUtil.parsePaginationOptions(query);

    const searchRegex = new RegExp(query.query, 'i');
    const baseFilter: any = { restaurantId, branchId };

    if (query.isActive !== undefined) {
      baseFilter.isActive = query.isActive === 'true';
    }

    // Search categories
    const categoriesFilter = {
      ...baseFilter,
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    };

    // Search menu items
    const itemsFilter = {
      ...baseFilter,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ]
    };

    if (query.isActive === undefined) {
      // For items, also check isAvailable when isActive is not specified
      itemsFilter.isAvailable = true;
    }

    // Execute searches in parallel
    const [
      matchingCategories,
      matchingItems,
      categoriesTotal,
      itemsTotal
    ] = await Promise.all([
      this.menuCategoryModel
        .find(categoriesFilter)
        .sort({ displayOrder: 1, name: 1 })
        .lean(),
      this.menuItemModel
        .find(itemsFilter)
        .populate('categoryId', 'name')
        .sort({ displayOrder: 1, name: 1 })
        .lean(),
      this.menuCategoryModel.countDocuments(categoriesFilter),
      this.menuItemModel.countDocuments(itemsFilter)
    ]);

    // Convert to search result items and calculate relevance scores
    const categoryResults: MenuSearchResultItem[] = matchingCategories.map(category => {
      const relevanceScore = this.calculateRelevanceScore(query.query, category.name, category.description);
      return {
        id: category._id.toString(),
        name: category.name,
        description: category.description,
        type: 'category' as const,
        imageUrl: category.imageUrl,
        isActive: category.isActive,
        relevanceScore
      };
    });

    const itemResults: MenuSearchResultItem[] = matchingItems.map(item => {
      const relevanceScore = this.calculateRelevanceScore(query.query, item.name, item.description, item.tags);
      return {
        id: item._id.toString(),
        name: item.name,
        description: item.description,
        type: 'item' as const,
        categoryId: item.categoryId?._id?.toString() || item.categoryId?.toString(),
        categoryName: (item.categoryId as any)?.name,
        imageUrl: item.imageUrls?.[0],
        pricing: item.pricing,
        isAvailable: item.isAvailable,
        isActive: item.isActive,
        tags: item.tags,
        relevanceScore
      };
    });

    // Combine and sort by relevance score
    const allResults = [...categoryResults, ...itemResults]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(skip, skip + limit);

    const totalResults = categoriesTotal + itemsTotal;
    const totalPages = Math.ceil(totalResults / limit);
    const searchTime = Date.now() - startTime;

    return {
      results: allResults,
      totalResults,
      categoriesFound: categoriesTotal,
      itemsFound: itemsTotal,
      query: query.query,
      searchTime,
      page,
      limit,
      totalPages
    };
  }

  private calculateRelevanceScore(
    searchQuery: string,
    name: string,
    description?: string,
    tags?: string[]
  ): number {
    let score = 0;
    const lowerQuery = searchQuery.toLowerCase();
    const lowerName = name.toLowerCase();
    const lowerDescription = description?.toLowerCase() || '';

    // Exact match in name (highest score)
    if (lowerName === lowerQuery) {
      score += 100;
    }
    // Name starts with query
    else if (lowerName.startsWith(lowerQuery)) {
      score += 80;
    }
    // Name contains query
    else if (lowerName.includes(lowerQuery)) {
      score += 60;
    }

    // Description matches
    if (lowerDescription.includes(lowerQuery)) {
      score += 30;
    }

    // Tags match
    if (tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) {
      score += 40;
    }

    // Boost shorter names (more likely to be exact matches)
    if (name.length < 20) {
      score += 10;
    }

    return score;
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
      imageUrl: doc.imageUrl,
      foodCategory: doc.foodCategory,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
