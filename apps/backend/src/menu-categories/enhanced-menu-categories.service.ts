import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EnhancedMenuCategory, EnhancedMenuCategoryDocument } from './schemas/enhanced-menu-category.schema';
import { EnhancedCreateCategoryDto } from './dtos/enhanced-create-category.dto';

interface QueryOptions {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  source?: string;
}

@Injectable()
export class EnhancedMenuCategoriesService {
  constructor(
    @InjectModel(EnhancedMenuCategory.name)
    private categoryModel: Model<EnhancedMenuCategoryDocument>
  ) {}

  async create(restaurantId: string, dto: EnhancedCreateCategoryDto) {
    // Handle legacy field mapping
    const categoryData = {
      restaurantId,
      nameEn: dto.nameEn || dto.name,
      nameAr: dto.nameAr,
      descriptionEn: dto.descriptionEn || dto.description,
      descriptionAr: dto.descriptionAr,
      imageUrl: dto.imageUrl,
      displayOrder: dto.displayOrder || 0,
      isAvailable: dto.isBlocked !== undefined ? !dto.isBlocked : (dto.isAvailable ?? true),
      status: dto.status || 'Active',
      source: 'manual',
      defaultGstRateId: dto.defaultGstRateId,
      defaultGstRate: dto.defaultGstRate,
      gstCategoryType: dto.gstCategoryType,
    };

    // Check for duplicate names
    const existingCategory = await this.categoryModel.findOne({
      restaurantId,
      nameEn: categoryData.nameEn,
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    // If no display order specified, set it to the next available order
    if (categoryData.displayOrder === 0) {
      const lastCategory = await this.categoryModel
        .findOne({ restaurantId })
        .sort({ displayOrder: -1 });
      categoryData.displayOrder = (lastCategory?.displayOrder || 0) + 1;
    }

    const category = new this.categoryModel(categoryData);
    await category.save();

    return this.mapToResponse(category);
  }

  async findAll(restaurantId: string, options: QueryOptions) {
    const { page, limit, search, status, source } = options;
    const skip = (page - 1) * limit;

    // Build query filters
    const filters: any = { restaurantId };

    if (search) {
      filters.$or = [
        { nameEn: { $regex: search, $options: 'i' } },
        { nameAr: { $regex: search, $options: 'i' } },
        { descriptionEn: { $regex: search, $options: 'i' } },
        { descriptionAr: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filters.status = status;
    }

    if (source) {
      filters.source = source;
    }

    const [categories, total] = await Promise.all([
      this.categoryModel
        .find(filters)
        .sort({ displayOrder: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(filters),
    ]);

    return {
      categories: categories.map(category => this.mapToResponse(category)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, restaurantId: string) {
    const category = await this.categoryModel.findOne({ _id: id, restaurantId });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.mapToResponse(category);
  }

  async update(id: string, restaurantId: string, dto: Partial<EnhancedCreateCategoryDto>) {
    const category = await this.categoryModel.findOne({ _id: id, restaurantId });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Handle legacy field mapping
    const updateData: any = {};

    if (dto.nameEn || dto.name) updateData.nameEn = dto.nameEn || dto.name;
    if (dto.nameAr) updateData.nameAr = dto.nameAr;
    if (dto.descriptionEn || dto.description) updateData.descriptionEn = dto.descriptionEn || dto.description;
    if (dto.descriptionAr) updateData.descriptionAr = dto.descriptionAr;
    if (dto.imageUrl) updateData.imageUrl = dto.imageUrl;
    if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;
    if (dto.isAvailable !== undefined) updateData.isAvailable = dto.isAvailable;
    if (dto.isBlocked !== undefined) updateData.isAvailable = !dto.isBlocked;
    if (dto.status) updateData.status = dto.status;
    if (dto.defaultGstRateId) updateData.defaultGstRateId = dto.defaultGstRateId;
    if (dto.defaultGstRate !== undefined) updateData.defaultGstRate = dto.defaultGstRate;
    if (dto.gstCategoryType) updateData.gstCategoryType = dto.gstCategoryType;

    // Check for duplicate names if name is being updated
    if (updateData.nameEn && updateData.nameEn !== category.nameEn) {
      const existingCategory = await this.categoryModel.findOne({
        restaurantId,
        nameEn: updateData.nameEn,
        _id: { $ne: id },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    const updatedCategory = await this.categoryModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return this.mapToResponse(updatedCategory);
  }

  async toggleAvailability(id: string, restaurantId: string) {
    const category = await this.categoryModel.findOne({ _id: id, restaurantId });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    category.isAvailable = !category.isAvailable;
    await category.save();

    return this.mapToResponse(category);
  }

  async toggleBlock(id: string, restaurantId: string) {
    const category = await this.categoryModel.findOne({ _id: id, restaurantId });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    category.isBlocked = !category.isBlocked;
    await category.save();

    return this.mapToResponse(category);
  }

  async reorderCategories(restaurantId: string, categoryIds: string[]) {
    const categories = await this.categoryModel.find({
      _id: { $in: categoryIds },
      restaurantId,
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('Some categories not found');
    }

    // Update display order based on array position
    const updatePromises = categoryIds.map((id, index) =>
      this.categoryModel.findByIdAndUpdate(id, { displayOrder: index + 1 })
    );

    await Promise.all(updatePromises);

    return { success: true, message: 'Categories reordered successfully' };
  }

  async delete(id: string, restaurantId: string) {
    // Check if category has items (you'll need to import MenuItems model)
    // For now, we'll just delete the category
    const result = await this.categoryModel.findOneAndDelete({ _id: id, restaurantId });

    if (!result) {
      throw new NotFoundException('Category not found');
    }

    return { success: true, message: 'Category deleted successfully' };
  }

  async bulkCreate(restaurantId: string, categories: EnhancedCreateCategoryDto[]) {
    const createdCategories = [];
    const errors = [];

    for (let i = 0; i < categories.length; i++) {
      try {
        const category = await this.create(restaurantId, {
          ...categories[i],
          source: 'pdf_extraction', // Mark as extracted from PDF
        });
        createdCategories.push(category);
      } catch (error) {
        errors.push({
          index: i,
          category: categories[i],
          error: error.message,
        });
      }
    }

    return {
      success: true,
      created: createdCategories.length,
      errors: errors.length,
      data: {
        categories: createdCategories,
        errors,
      },
    };
  }

  async uploadImage(restaurantId: string, file: Express.Multer.File) {
    // Convert to base64 for now (you can implement cloud storage later)
    const base64 = file.buffer.toString('base64');
    const imageUrl = `data:${file.mimetype};base64,${base64}`;

    return {
      imageUrl,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  private mapToResponse(category: EnhancedMenuCategoryDocument) {
    return {
      _id: category._id,
      restaurantId: category.restaurantId,
      nameEn: category.nameEn,
      nameAr: category.nameAr,
      descriptionEn: category.descriptionEn,
      descriptionAr: category.descriptionAr,
      imageUrl: category.imageUrl,
      displayOrder: category.displayOrder,
      isAvailable: category.isAvailable,
      isBlocked: category.isBlocked,
      status: category.status,
      source: category.source,
      defaultGstRateId: category.defaultGstRateId,
      defaultGstRate: category.defaultGstRate,
      gstCategoryType: category.gstCategoryType,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}