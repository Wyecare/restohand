import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { RecipesService, CreateRecipeDto, UpdateRecipeDto } from './recipes.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';

export interface GetRecipesQuery {
  category?: string;
  isStandardized?: string;
  hasMenuItem?: string;
  search?: string;
}

export interface RecalculateCostsResponse {
  success: boolean;
  message: string;
  updated: number;
}

@Controller('restaurants/:restaurantId/recipes')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  @Roles(UserRole.Manager)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() createRecipeDto: CreateRecipeDto,
  ) {
    return this.recipesService.create({
      ...createRecipeDto,
      restaurantId,
    });
  }

  @Get()
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  async findAll(
    @Param('restaurantId') restaurantId: string,
    @Query() query: GetRecipesQuery,
  ) {
    const filters = {
      category: query.category,
      isStandardized: query.isStandardized === 'true' ? true : query.isStandardized === 'false' ? false : undefined,
      hasMenuItem: query.hasMenuItem === 'true' ? true : query.hasMenuItem === 'false' ? false : undefined,
      search: query.search,
    };

    return this.recipesService.findAll(restaurantId, filters);
  }

  @Get('cost-summary')
  @Roles(UserRole.Manager)
  async getCostSummary(@Param('restaurantId') restaurantId: string) {
    return this.recipesService.getCostSummary(restaurantId);
  }

  @Get(':id')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.recipesService.findOne(id, restaurantId);
  }

  @Patch(':id')
  @Roles(UserRole.Manager)
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() updateRecipeDto: UpdateRecipeDto,
  ) {
    return this.recipesService.update(id, restaurantId, updateRecipeDto);
  }

  @Delete(':id')
  @Roles(UserRole.Manager)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    await this.recipesService.remove(id, restaurantId);
  }

  @Post('recalculate-costs')
  @Roles(UserRole.Manager)
  async recalculateAllCosts(
    @Param('restaurantId') restaurantId: string,
  ): Promise<RecalculateCostsResponse> {
    const result = await this.recipesService.recalculateAllCosts(restaurantId);

    return {
      success: true,
      message: `Successfully recalculated costs for ${result.updated} recipes`,
      updated: result.updated,
    };
  }

  @Patch(':id/standardize')
  @Roles(UserRole.Manager)
  async standardizeRecipe(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.recipesService.update(id, restaurantId, { isStandardized: true });
  }

  @Patch(':id/unstandardize')
  @Roles(UserRole.Manager)
  async unstandardizeRecipe(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.recipesService.update(id, restaurantId, { isStandardized: false });
  }
}