import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MenuPriceTag, MenuPriceTagSchema } from './schemas/menu-price-tag.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { MenuPriceTagsController } from './menu-price-tags.controller';
import { MenuPriceTagsService } from './menu-price-tags.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ScheduleModule.forRoot(), // For cron jobs
    MongooseModule.forFeature([
      { name: MenuPriceTag.name, schema: MenuPriceTagSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
  ],
  controllers: [MenuPriceTagsController],
  providers: [MenuPriceTagsService],
  exports: [MenuPriceTagsService],
})
export class MenuPriceTagsModule {}