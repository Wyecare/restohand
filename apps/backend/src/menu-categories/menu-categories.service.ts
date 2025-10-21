import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuCategoryResponseDto } from './dtos/menu-category-response.dto';
import { CreateMenuCategoryDto } from './dtos/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dtos/update-menu-category.dto';
import {
  MenuCategory,
  MenuCategoryDocument,
} from './schemas/menu-category.schema';

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

  async findAll(restaurantId: string): Promise<MenuCategoryResponseDto[]> {
    const items = await this.menuCategoryModel
      .find({ restaurantId })
      .sort({ displayOrder: 1, createdAt: 1 });
    return items.map((item) => this.toDto(item));
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
      name: doc.name,
      description: doc.description,
      displayOrder: doc.displayOrder,
      isActive: doc.isActive,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
