import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { ProfitAlertsService } from './profit-alerts.service';
import { ProfitAlertsController } from './profit-alerts.controller';
import { Recipe, RecipeSchema } from './schemas/recipe.schema';
import { InventoryItem, InventoryItemSchema } from '../inventory/schemas/inventory-item.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Recipe.name, schema: RecipeSchema },
      { name: InventoryItem.name, schema: InventoryItemSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
  ],
  controllers: [RecipesController, ProfitAlertsController],
  providers: [RecipesService, ProfitAlertsService],
  exports: [RecipesService],
})
export class RecipesModule {}