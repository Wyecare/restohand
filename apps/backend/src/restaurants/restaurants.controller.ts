import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiCreatedResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
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
import { RestaurantOnboardingService } from './restaurant-onboarding.service';

@ApiTags('restaurants')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly onboardingService: RestaurantOnboardingService
  ) {}

  @Post()
  @Roles(UserRole.Manager)
  @ApiCreatedResponse({ type: RestaurantResponseDto })
  async create(@Body() dto: CreateRestaurantDto, @Req() req: Request) {
    return this.restaurantsService.create(dto, req.user);
  }

  @Get()
  @Roles(UserRole.Manager)
  @ApiOkResponse({ type: RestaurantListResponseDto })
  async findAll(@Query() query: QueryRestaurantsDto) {
    return this.restaurantsService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({ type: RestaurantResponseDto })
  async findOne(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({ type: RestaurantResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto
  ) {
    return this.restaurantsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({ description: 'Restaurant archived successfully' })
  async remove(@Param('id') id: string) {
    await this.restaurantsService.remove(id);
    return { success: true };
  }

  @Get(':id/qrcode')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiQuery({ name: 'table', required: false })
  async generateQr(
    @Param('id') id: string,
    @Query('table') table?: string
  ) {
    return this.restaurantsService.generateQrCode(id, table);
  }

  @Post(':id/payment/setup-linked-account')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({
    description: 'Setup linked account response',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        linkedAccountId: { type: 'string' },
        status: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  async setupLinkedAccount(@Param('id') id: string) {
    return this.onboardingService.setupLinkedAccount(id);
  }

  @Get(':id/payment/status')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({
    description: 'Payment status information',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        canReceivePayments: { type: 'boolean' },
        linkedAccountId: { type: 'string' },
        error: { type: 'string' },
        setupAttempts: { type: 'number' },
        lastAttempt: { type: 'string' }
      }
    }
  })
  async getPaymentStatus(@Param('id') id: string) {
    const restaurant = await this.restaurantsService.findById(id);

    return {
      status: restaurant.paymentConfig?.status || 'pending_setup',
      canReceivePayments: restaurant.paymentConfig?.canReceivePayments || false,
      linkedAccountId: restaurant.paymentConfig?.linkedAccountId,
      error: restaurant.paymentConfig?.error,
      setupAttempts: restaurant.paymentConfig?.setupAttempts || 0,
      lastAttempt: restaurant.paymentConfig?.lastAttempt?.toISOString(),
    };
  }
}
