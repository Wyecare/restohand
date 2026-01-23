import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MenuItemsController } from './menu-items.controller';
import { MenuItemsService } from './menu-items.service';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';
import { ImageUploadService } from '../common/services/image-upload.service';
import { GstRate, GstRateSchema } from '../gst/schemas/gst-rate.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { Recipe, RecipeSchema } from '../recipes/schemas/recipe.schema';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: GstRate.name, schema: GstRateSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Recipe.name, schema: RecipeSchema },
    ]),
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [MenuItemsController],
  providers: [MenuItemsService, ImageUploadService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
