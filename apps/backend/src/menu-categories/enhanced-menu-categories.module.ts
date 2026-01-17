import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnhancedMenuCategoriesController } from './enhanced-menu-categories.controller';
import { EnhancedMenuCategoriesService } from './enhanced-menu-categories.service';
import { EnhancedMenuCategory, EnhancedMenuCategorySchema } from './schemas/enhanced-menu-category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EnhancedMenuCategory.name, schema: EnhancedMenuCategorySchema },
    ]),
  ],
  controllers: [EnhancedMenuCategoriesController],
  providers: [EnhancedMenuCategoriesService],
  exports: [EnhancedMenuCategoriesService],
})
export class EnhancedMenuCategoriesModule {}