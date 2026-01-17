import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { MenuExtractionService } from './menu-extraction.service';
import { MenuExtractionController } from './menu-extraction.controller';
import { MenuCategory, MenuCategorySchema } from '../menu-categories/schemas/menu-category.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: MenuCategory.name, schema: MenuCategorySchema },
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
  ],
  controllers: [MenuExtractionController],
  providers: [MenuExtractionService],
  exports: [MenuExtractionService],
})
export class MenuExtractionModule {}