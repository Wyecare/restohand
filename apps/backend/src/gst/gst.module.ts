import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { GstController, HsnCodeController } from './gst.controller';
import { GstService } from './gst.service';
import { SmartGstService } from './smart-gst.service';
import { FoodCategoryService } from './food-category.service';
import { GstRate, GstRateSchema } from './schemas/gst-rate.schema';
import { HsnCode, HsnCodeSchema } from './schemas/hsn-code.schema';
import { TaxInvoice, TaxInvoiceSchema } from './schemas/tax-invoice.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GstRate.name, schema: GstRateSchema },
      { name: HsnCode.name, schema: HsnCodeSchema },
      { name: TaxInvoice.name, schema: TaxInvoiceSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
    AuthModule,
  ],
  controllers: [GstController, HsnCodeController],
  providers: [
    GstService, // Keep old service for compatibility during transition
    SmartGstService, // New simplified service
    FoodCategoryService, // Food category detection service
  ],
  exports: [
    GstService,
    SmartGstService,
    FoodCategoryService,
  ],
})
export class GstModule {}
