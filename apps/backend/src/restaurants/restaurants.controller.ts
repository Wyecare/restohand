import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiCreatedResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateRestaurantDto } from './dtos/create-restaurant.dto';
import { RestaurantListResponseDto } from './dtos/restaurant-list-response.dto';
import { RestaurantResponseDto } from './dtos/restaurant-response.dto';
import { UpdateRestaurantDto } from './dtos/update-restaurant.dto';
import { QueryRestaurantsDto } from './dtos/query-restaurants.dto';
import { RestaurantsService } from './restaurants.service';

@ApiTags('restaurants')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @ApiCreatedResponse({ type: RestaurantResponseDto })
  async create(@Body() dto: CreateRestaurantDto) {
    return this.restaurantsService.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: RestaurantListResponseDto })
  async findAll(@Query() query: QueryRestaurantsDto) {
    return this.restaurantsService.findAll(query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({ type: RestaurantResponseDto })
  async findOne(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({ type: RestaurantResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto
  ) {
    return this.restaurantsService.update(id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({ description: 'Restaurant archived successfully' })
  async remove(@Param('id') id: string) {
    await this.restaurantsService.remove(id);
    return { success: true };
  }
}
