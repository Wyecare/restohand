import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import {
  MenuCategory,
  MenuCategorySchema,
} from './schemas/menu-category.schema';
import { MenuCategoriesController } from './menu-categories.controller';
import { MenuCategoriesService } from './menu-categories.service';
import { ImageUploadService } from '../common/services/image-upload.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: MenuCategory.name, schema: MenuCategorySchema },
    ]),
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [MenuCategoriesController],
  providers: [MenuCategoriesService, ImageUploadService],
  exports: [MenuCategoriesService],
})
export class MenuCategoriesModule {}
